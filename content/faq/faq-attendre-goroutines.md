---
title: Comment attendre la fin de plusieurs goroutines ?
category: faq
order: 7
level: intermédiaire
summary: Avec un sync.WaitGroup : wg.Add(1) avant chaque go, defer wg.Done() dans la goroutine, wg.Wait() pour attendre. Pour récupérer des résultats, utilisez un channel ; pour les erreurs, errgroup.
aliases: attendre goroutines, wait goroutines, waitgroup, attendre la fin, synchroniser, join, await, promise all, goroutines terminées, main se termine trop tôt
related: sync, goroutines, channels, patterns-concurrence
questions:
  - Comment attendre que toutes mes goroutines soient terminées ?
  - Comment récupérer les résultats de plusieurs goroutines ? -> resultats
  - Comment attendre des goroutines et récupérer leurs erreurs ? -> erreurs
  - Pourquoi mon programme se termine avant mes goroutines ? -> pourquoi
---

@@ rapide

```go
var wg sync.WaitGroup

for _, fichier := range fichiers {
	wg.Add(1) // 1. avant le go
	go func() {
		defer wg.Done() // 2. à la fin de la goroutine
		traiter(fichier)
	}()
}

wg.Wait() // 3. bloque jusqu'à ce que toutes aient appelé Done
fmt.Println("tout est traité")
```

Depuis Go 1.25, encore plus court :

```go
var wg sync.WaitGroup
for _, fichier := range fichiers {
	wg.Go(func() { traiter(fichier) })
}
wg.Wait()
```

@@ detail

## Pourquoi faut-il attendre ? {#pourquoi}

Le programme s'arrête dès que `main` se termine, **sans attendre** les goroutines. Sans synchronisation, leur travail est interrompu (ou ne commence même pas).

`time.Sleep` n'est pas une solution : trop court, le travail est coupé ; trop long, on perd du temps.

## Récupérer des résultats {#resultats}

**Avec une slice indexée** (ordre conservé, pas de verrou nécessaire car chaque goroutine écrit à son propre indice) :

```go
tailles := make([]int64, len(fichiers))
var wg sync.WaitGroup
for i, f := range fichiers {
	wg.Add(1)
	go func() {
		defer wg.Done()
		info, err := os.Stat(f)
		if err == nil {
			tailles[i] = info.Size()
		}
	}()
}
wg.Wait()
```

**Avec un channel** (ordre d'arrivée) :

```go
type resultat struct {
	url    string
	statut int
	err    error
}

res := make(chan resultat)
var wg sync.WaitGroup
for _, u := range urls {
	wg.Add(1)
	go func() {
		defer wg.Done()
		r, err := http.Get(u)
		if err != nil {
			res <- resultat{url: u, err: err}
			return
		}
		r.Body.Close()
		res <- resultat{url: u, statut: r.StatusCode}
	}()
}

go func() {
	wg.Wait()
	close(res) // ferme quand tout le monde a envoyé
}()

for r := range res {
	fmt.Println(r.url, r.statut, r.err)
}
```

La goroutine qui ferme `res` après `wg.Wait()` est indispensable : sans elle, le `range` attendrait indéfiniment.

## Récupérer les erreurs {#erreurs}

`errgroup` (module `golang.org/x/sync`) attend toutes les goroutines et renvoie la **première erreur** ; avec `WithContext`, il annule les autres :

```go
g, ctx := errgroup.WithContext(context.Background())
for _, u := range urls {
	g.Go(func() error {
		return telecharger(ctx, u)
	})
}
if err := g.Wait(); err != nil {
	log.Fatal(err)
}
```

## Une seule goroutine : un channel suffit {#une-seule}

```go
fini := make(chan error, 1)
go func() {
	fini <- longTraitement()
}()
// … autre travail …
if err := <-fini; err != nil {
	log.Fatal(err)
}
```

## Les erreurs classiques {#erreurs-classiques}

| Erreur | Conséquence | Correction |
|---|---|---|
| `wg.Add(1)` dans la goroutine | `Wait` peut passer trop tôt | `Add` avant le `go` |
| `Done` oublié sur un chemin | `Wait` bloque pour toujours | `defer wg.Done()` |
| WaitGroup passé par valeur | `Wait` ne voit jamais les `Done` | passer `*sync.WaitGroup` |
| `Add` trop petit | `panic: sync: negative WaitGroup counter` | un `Add` par goroutine |

Voir [[sync#waitgroup]] et [[patterns-concurrence]].
