---
title: Goroutines
category: concurrence
order: 1
level: intermédiaire
summary: Une goroutine est une fonction exécutée de façon concurrente, lancée avec le mot-clé go. Très légère (quelques Ko), on peut en lancer des milliers. Il faut les synchroniser (WaitGroup, channels), car main n'attend pas leur fin.
aliases: goroutine, goroutines, go, thread, threads, fil d'exécution, tâche, concurrence, concurrent, parallélisme, parallèle, asynchrone, async, await, simultané, en même temps, ordonnanceur, scheduler, gomaxprocs, fuite de goroutine, goroutine leak
related: channels, sync, select, context, patterns-concurrence, faq-attendre-goroutines, faq-data-race, faq-boucle-goroutine
questions:
  - Qu'est-ce qu'une goroutine ?
  - Comment lancer une fonction en parallèle en Go ? -> lancer
  - Pourquoi ma goroutine ne s'exécute pas ? -> main-attend-pas
  - Quelle différence entre concurrence et parallélisme ? -> concurrence-parallelisme
  - Combien de goroutines peut-on lancer ? -> legeres
  - Qu'est-ce qu'une fuite de goroutine ? -> fuites
---

@@ rapide

```go
func travailler(id int) {
	fmt.Println("travail", id)
}

func main() {
	var wg sync.WaitGroup
	for i := range 3 {
		wg.Add(1)
		go func() { // « go » lance la fonction en concurrence
			defer wg.Done()
			travailler(i)
		}()
	}
	wg.Wait() // attendre la fin de toutes les goroutines
}
```

- `go f()` lance `f` dans une nouvelle goroutine et **continue immédiatement** sans attendre.
- Quand `main` se termine, **le programme s'arrête**, même si des goroutines tournent encore.
- On synchronise avec un **`sync.WaitGroup`**, des **channels** ou un **`context`**.
- Les goroutines partagent la mémoire : protégez les données communes (mutex) ou communiquez par channels.

@@ detail

## Lancer une goroutine {#lancer}

Il suffit de placer `go` devant un appel de fonction :

```go
go envoyerEmail(destinataire) // fonction nommée
go func() {                   // fonction anonyme
	fmt.Println("en arrière-plan")
}()
go serveur.Demarrer() // méthode
```

L'appel `go` rend la main **immédiatement**. Les arguments sont évalués au moment du `go`, puis la fonction s'exécute de son côté. Toute valeur renvoyée par la fonction est **ignorée** : pour récupérer un résultat, on utilise un channel.

## main n'attend pas {#main-attend-pas}

```go
func main() {
	go fmt.Println("bonjour depuis une goroutine")
}

// N'affiche probablement rien : main se termine avant que la goroutine ait démarré.
```

Ajouter un `time.Sleep` « pour voir » est une **mauvaise solution** (on ne sait jamais combien attendre). Il faut une vraie synchronisation :

```go
func main() {
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		fmt.Println("bonjour depuis une goroutine")
	}()
	wg.Wait()
}
```

Ou avec un channel :

```go
func main() {
	fini := make(chan struct{})
	go func() {
		fmt.Println("bonjour depuis une goroutine")
		close(fini)
	}()
	<-fini // bloque jusqu'à la fermeture
}
```

Voir [[faq-attendre-goroutines]].

## Récupérer des résultats {#resultats}

```go
func carre(n int, res chan<- int) {
	res <- n * n
}

func main() {
	res := make(chan int)
	nombres := []int{2, 3, 4}
	for _, n := range nombres {
		go carre(n, res)
	}
	somme := 0
	for range nombres {
		somme += <-res // on reçoit autant de résultats que de goroutines lancées
	}
	fmt.Println(somme) // 29
}
```

Les résultats arrivent dans un **ordre quelconque**. Si l'ordre compte, écrivez dans une slice à l'indice prévu (chaque goroutine son propre indice, pas de conflit) :

```go
resultats := make([]int, len(nombres))
var wg sync.WaitGroup
for i, n := range nombres {
	wg.Add(1)
	go func() {
		defer wg.Done()
		resultats[i] = n * n // indices distincts : pas de data race
	}()
}
wg.Wait()
```

## Des goroutines très légères {#legeres}

| | Thread système | Goroutine |
|---|---|---|
| Mémoire initiale | ~1 à 8 Mo de pile | ~2 à 8 Ko, qui grandit à la demande |
| Création | coûteuse (appel système) | très rapide |
| Changement de contexte | lent (noyau) | rapide (runtime Go) |
| Nombre raisonnable | quelques milliers | des centaines de milliers |

```go
var wg sync.WaitGroup
for range 100_000 {
	wg.Add(1)
	go func() {
		defer wg.Done()
		time.Sleep(time.Second)
	}()
}
wg.Wait() // ≈ 1 seconde, et quelques centaines de Mo au maximum
```

## L'ordonnanceur {#ordonnanceur}

Le runtime Go répartit les goroutines (G) sur un petit nombre de threads système (M) via des processeurs logiques (P) : c'est le **modèle M:N**. Quand une goroutine attend (réseau, channel, `Sleep`), le runtime en exécute une autre sur le même thread.

Le nombre de goroutines qui s'exécutent **réellement en parallèle** est limité par `GOMAXPROCS`, qui vaut par défaut le nombre de cœurs disponibles (et, depuis Go 1.25, tient compte de la limite de CPU d'un conteneur).

```go
fmt.Println(runtime.NumCPU())       // cœurs disponibles
fmt.Println(runtime.GOMAXPROCS(0))  // valeur actuelle (0 = lire sans modifier)
fmt.Println(runtime.NumGoroutine()) // goroutines vivantes
```

## Concurrence et parallélisme {#concurrence-parallelisme}

- La **concurrence** consiste à **structurer** un programme en tâches indépendantes qui progressent en même temps (en s'alternant, éventuellement sur un seul cœur).
- Le **parallélisme** consiste à **exécuter** réellement plusieurs tâches au même instant, sur plusieurs cœurs.

> La concurrence, c'est gérer beaucoup de choses à la fois. Le parallélisme, c'est faire beaucoup de choses à la fois. — Rob Pike

Les goroutines expriment la concurrence ; le runtime en tire du parallélisme quand il y a plusieurs cœurs.

## Partager la mémoire en sécurité {#memoire-partagee}

Les goroutines d'un programme partagent la même mémoire. Deux goroutines qui accèdent à la même variable, dont au moins une en écriture, sans synchronisation, créent une **data race** : un bug aléatoire et difficile à reproduire.

```go
compteur := 0
var wg sync.WaitGroup
for range 1000 {
	wg.Add(1)
	go func() {
		defer wg.Done()
		compteur++ // ❌ data race : le résultat final est imprévisible
	}()
}
wg.Wait()
fmt.Println(compteur) // souvent moins de 1000
```

Solutions : un `sync.Mutex`, un compteur atomique (`atomic.Int64`), ou faire passer les données par des channels. Détectez les races avec `go run -race` ou `go test -race`. Voir [[faq-data-race]] et [[sync]].

:::info Le proverbe Go
« Ne communiquez pas en partageant la mémoire ; partagez la mémoire en communiquant. » Autrement dit : plutôt que de protéger une variable commune, faites circuler la donnée par un [[channels|channel]].
:::

## Les fuites de goroutines {#fuites}

Une goroutine bloquée pour toujours (sur un channel que personne ne lit, par exemple) n'est **jamais libérée** : c'est une fuite.

```go
func premierResultat(urls []string) string {
	res := make(chan string) // ⚠️ sans tampon
	for _, u := range urls {
		go func() { res <- telecharger(u) }()
	}
	return <-res // on lit UN résultat : les autres goroutines restent bloquées pour toujours
}
```

Corrections possibles : un channel avec tampon de taille `len(urls)`, ou un `context` pour annuler les goroutines restantes. Règle d'or : **pour chaque goroutine lancée, sachez comment et quand elle se termine.**

## Panics dans une goroutine {#panic}

Un panic non rattrapé dans une goroutine arrête **tout le programme**. Voir [[panic-recover#goroutines]].
