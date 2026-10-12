---
title: Patterns de concurrence
category: concurrence
order: 6
level: avancé
summary: Les modèles éprouvés pour structurer du code concurrent en Go : worker pool, pipeline, fan-out/fan-in, sémaphore, errgroup, limitation de débit et arrêt propre.
aliases: pattern, patterns, motif, worker pool, pool de workers, workers, pipeline, fan-out, fan-in, fan out, fan in, sémaphore, semaphore, limiter la concurrence, errgroup, rate limit, limitation de débit, graceful shutdown, arrêt propre, générateur, parallélisme borné
related: goroutines, channels, select, sync, context, faq-attendre-goroutines
questions:
  - Comment créer un pool de workers en Go ? -> worker-pool
  - Comment limiter le nombre de goroutines simultanées ? -> semaphore
  - Comment faire un pipeline de traitement ? -> pipeline
  - Comment arrêter toutes les goroutines à la première erreur ? -> errgroup
  - Comment arrêter proprement un serveur (graceful shutdown) ? -> arret-propre
  - Comment fusionner plusieurs channels en un seul ? -> fan-in
---

@@ rapide

Le **worker pool** est le modèle le plus utile : N goroutines (workers) consomment des tâches depuis un channel.

```go
func workerPool(taches []int, nbWorkers int) []int {
	jobs := make(chan int)
	resultats := make(chan int)

	var wg sync.WaitGroup
	for range nbWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range jobs { // chaque worker prend la tâche suivante
				resultats <- t * t
			}
		}()
	}

	go func() { // alimente les jobs
		for _, t := range taches {
			jobs <- t
		}
		close(jobs)
	}()

	go func() { wg.Wait(); close(resultats) }() // ferme quand tout est fini

	var res []int
	for r := range resultats {
		res = append(res, r)
	}
	return res
}
```

Autres modèles : **pipeline** (étapes reliées par des channels), **sémaphore** (limiter la concurrence), **errgroup** (arrêt à la première erreur), **arrêt propre** avec `signal.NotifyContext`.

@@ detail

## Worker pool {#worker-pool}

Problème : 10 000 images à redimensionner. Lancer 10 000 goroutines saturerait le CPU et la mémoire. Solution : un **nombre fixe** de workers qui se partagent le travail.

```go
type Tache struct {
	ID     int
	Chemin string
}

type Resultat struct {
	ID  int
	Err error
}

func traiterTout(ctx context.Context, taches []Tache, nbWorkers int) []Resultat {
	jobs := make(chan Tache)
	sortie := make(chan Resultat)

	var wg sync.WaitGroup
	for w := range nbWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range jobs {
				err := redimensionner(ctx, t.Chemin)
				log.Printf("worker %d : tâche %d terminée", w, t.ID)
				sortie <- Resultat{ID: t.ID, Err: err}
			}
		}()
	}

	// Producteur
	go func() {
		defer close(jobs)
		for _, t := range taches {
			select {
			case jobs <- t:
			case <-ctx.Done():
				return // arrêt anticipé
			}
		}
	}()

	// Fermeture de la sortie quand tous les workers ont fini
	go func() {
		wg.Wait()
		close(sortie)
	}()

	var resultats []Resultat
	for r := range sortie {
		resultats = append(resultats, r)
	}
	return resultats
}
```

Le nombre de workers dépend du travail : `runtime.NumCPU()` pour du calcul pur, davantage pour des tâches qui attendent le réseau ou le disque.

## Sémaphore : limiter la concurrence {#semaphore}

Plus simple qu'un pool quand on veut juste **borner** le nombre de goroutines actives : un channel avec tampon sert de jeton.

```go
func telechargerTout(urls []string) {
	sem := make(chan struct{}, 5) // au plus 5 téléchargements simultanés
	var wg sync.WaitGroup

	for _, url := range urls {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}        // prendre un jeton (bloque si 5 sont pris)
			defer func() { <-sem }() // rendre le jeton
			telecharger(url)
		}()
	}
	wg.Wait()
}
```

Le module `golang.org/x/sync/semaphore` propose une version pondérée, compatible avec `context`.

## Pipeline {#pipeline}

Une suite d'**étapes** reliées par des channels ; chaque étape tourne dans sa goroutine et transforme les données au fil de l'eau :

```go
func generer(ctx context.Context, nombres ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nombres {
			select {
			case out <- n:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}

func auCarre(ctx context.Context, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			select {
			case out <- n * n:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel() // arrête toutes les étapes si on sort plus tôt

	for v := range auCarre(ctx, auCarre(ctx, generer(ctx, 1, 2, 3))) {
		fmt.Println(v) // 1 16 81
	}
}
```

Chaque étape **ferme** son channel de sortie quand elle a fini, ce qui termine proprement le `range` de l'étape suivante. Le `ctx` évite les fuites si le consommateur s'arrête en route.

## Fan-out et fan-in {#fan-in}

- **Fan-out** : plusieurs goroutines lisent le **même** channel pour répartir le travail (c'est le worker pool).
- **Fan-in** : on **fusionne** plusieurs channels en un seul.

```go
func fusionner[T any](entrees ...<-chan T) <-chan T {
	sortie := make(chan T)
	var wg sync.WaitGroup
	for _, ch := range entrees {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for v := range ch {
				sortie <- v
			}
		}()
	}
	go func() {
		wg.Wait()
		close(sortie) // une seule fermeture, quand TOUS les émetteurs ont fini
	}()
	return sortie
}
```

## errgroup : arrêt à la première erreur {#errgroup}

Le module `golang.org/x/sync/errgroup` combine `WaitGroup`, propagation d'erreur et annulation :

```go
import "golang.org/x/sync/errgroup"

func chargerPage(ctx context.Context, id int) (*Page, error) {
	g, ctx := errgroup.WithContext(ctx)
	var user *User
	var posts []Post

	g.Go(func() error {
		var err error
		user, err = chargerUser(ctx, id)
		return err
	})
	g.Go(func() error {
		var err error
		posts, err = chargerPosts(ctx, id)
		return err
	})

	if err := g.Wait(); err != nil { // première erreur ; ctx est alors annulé pour les autres
		return nil, err
	}
	return &Page{User: user, Posts: posts}, nil
}
```

`g.SetLimit(n)` limite en plus le nombre de goroutines simultanées.

## Limitation de débit (rate limiting) {#rate-limit}

```go
limite := time.NewTicker(200 * time.Millisecond) // 5 requêtes par seconde
defer limite.Stop()

for _, req := range requetes {
	<-limite.C // attend le prochain « tic »
	go envoyer(req)
}
```

Pour des besoins plus fins (rafales autorisées, limite par client), le module `golang.org/x/time/rate` implémente un *token bucket*.

## Résultat le plus rapide {#premier}

Interroger plusieurs serveurs identiques et garder la première réponse :

```go
func premier(ctx context.Context, serveurs []string) (string, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel() // annule les requêtes encore en cours

	res := make(chan string, len(serveurs)) // tampon : aucune goroutine ne restera bloquée
	for _, s := range serveurs {
		go func() {
			if r, err := interroger(ctx, s); err == nil {
				res <- r
			}
		}()
	}
	select {
	case r := <-res:
		return r, nil
	case <-ctx.Done():
		return "", ctx.Err()
	}
}
```

## Arrêt propre (graceful shutdown) {#arret-propre}

Un serveur doit, à la réception de `Ctrl+C` ou `SIGTERM`, arrêter d'accepter des connexions et laisser finir les requêtes en cours :

```go
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv := &http.Server{Addr: ":8080", Handler: routes()}

	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()
	log.Println("serveur démarré sur :8080")

	<-ctx.Done() // attend le signal
	log.Println("arrêt demandé…")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("arrêt forcé : %v", err)
	}
	log.Println("au revoir")
}
```

## Détecter les problèmes {#detecter}

- `go run -race` / `go test -race` : détecte les **data races** à l'exécution.
- `runtime.NumGoroutine()` qui ne fait qu'augmenter : signe de **fuite** de goroutines.
- Le profil `goroutine` de `net/http/pprof` montre où chaque goroutine est bloquée.
- Le package `testing/synctest` (Go 1.25) permet de tester du code concurrent avec une horloge virtuelle.
