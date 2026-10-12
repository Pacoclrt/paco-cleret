---
title: "« all goroutines are asleep - deadlock! » : que faire ?"
category: faq
order: 21
level: intermédiaire
summary: Le runtime a détecté que toutes les goroutines sont bloquées (sur un channel, un mutex ou un WaitGroup) et qu'aucune ne pourra jamais avancer. Causes classiques : envoi sans récepteur, range sur un channel jamais fermé, Wait sans Done.
aliases: deadlock, interblocage, all goroutines are asleep, fatal error deadlock, programme bloqué, channel bloqué, blocage, goroutine bloquée, programme qui ne se termine pas, freeze
related: channels, sync, goroutines, select, faq-attendre-goroutines
questions:
  - Que signifie « fatal error all goroutines are asleep - deadlock! » ?
  - Pourquoi mon range sur un channel ne se termine jamais ? -> range-non-ferme
  - Pourquoi mon programme est bloqué sans message d'erreur ? -> blocage-partiel
---

@@ rapide

Les causes les plus fréquentes et leur correction :

```go
// 1. Envoi sur un channel non bufferisé, sans récepteur
ch := make(chan int)
ch <- 1 // ❌ bloque : personne ne lit
// ✅ recevoir dans une autre goroutine, ou make(chan int, 1)

// 2. range sur un channel jamais fermé
for v := range ch {
} // ❌ attend une valeur qui ne viendra jamais
// ✅ l'émetteur doit appeler close(ch) quand il a fini

// 3. WaitGroup qui ne revient jamais à zéro
wg.Add(2)
go func() { defer wg.Done() }()
wg.Wait() // ❌ il manque un Done
// ✅ un Add(1) par goroutine lancée

// 4. Mutex verrouillé deux fois
mu.Lock()
mu.Lock() // ❌ un mutex Go n'est pas réentrant
```

@@ detail

## Ce que signifie le message {#message}

```text
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [chan send]:
main.main()
	/app/main.go:7 +0x36
exit status 2
```

Le runtime a constaté que **toutes** les goroutines attendent quelque chose qu'aucune autre ne pourra fournir. La suite du message indique, pour chaque goroutine, **sur quoi** elle est bloquée (`chan send`, `chan receive`, `sync.WaitGroup.Wait`, `sync.Mutex.Lock`, `select`) et à **quelle ligne**.

C'est une **erreur fatale** : elle ne peut pas être rattrapée avec `recover`.

## Envoyer sans récepteur {#envoi}

```go
func main() {
	ch := make(chan string)
	ch <- "bonjour"   // bloque pour toujours
	fmt.Println(<-ch) // jamais atteint
}
```

Sur un channel **sans tampon**, l'envoi attend un récepteur **en même temps**. Ici, la seule goroutine (main) est l'émettrice. Corrections :

```go
// Envoyer depuis une autre goroutine
go func() { ch <- "bonjour" }()
fmt.Println(<-ch)

// Ou utiliser un tampon
ch := make(chan string, 1)
ch <- "bonjour"
fmt.Println(<-ch)
```

## range sur un channel jamais fermé {#range-non-ferme}

```go
func main() {
	ch := make(chan int)
	go func() {
		for i := range 3 {
			ch <- i
		}
		// ❌ oubli de close(ch)
	}()
	for v := range ch { // après 0, 1, 2 : attend pour toujours
		fmt.Println(v)
	}
}
```

`range` s'arrête uniquement quand le channel est **fermé**. Ajoutez `defer close(ch)` au début de la goroutine émettrice. Avec plusieurs émetteurs, fermez après un `wg.Wait()` dans une goroutine dédiée (voir [[channels#fermer]]).

## Recevoir plus que ce qui est envoyé {#trop-recevoir}

```go
res := make(chan int)
for _, n := range []int{1, 2, 3} {
	go func() { res <- n * n }()
}
for range 4 { // ❌ 4 réceptions pour 3 envois
	fmt.Println(<-res)
}
```

## WaitGroup {#waitgroup}

```go
var wg sync.WaitGroup
wg.Add(3)
for i := range 2 { // ❌ 2 goroutines pour Add(3)
	go func() {
		defer wg.Done()
		fmt.Println(i)
	}()
}
wg.Wait() // le compteur reste à 1
```

Autre variante : la goroutine qui doit appeler `Done` est elle-même bloquée sur un channel que `main` lira… après `wg.Wait()`. Lisez les résultats **avant** ou **pendant** l'attente, pas après :

```go
var wg sync.WaitGroup
res := make(chan int) // sans tampon
for i := range 3 {
	wg.Add(1)
	go func() {
		defer wg.Done()
		res <- i // bloque tant que personne ne lit
	}()
}
wg.Wait() // ❌ attend des goroutines bloquées sur res
for v := range res {
	fmt.Println(v)
}

// ✅ Correction : fermer res dans une goroutine qui attend, et lire dans main
go func() {
	wg.Wait()
	close(res)
}()
for v := range res {
	fmt.Println(v)
}
```

## Mutex {#mutex}

```go
func (c *Compteur) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
	c.Afficher() // ❌ si Afficher prend aussi c.mu.Lock() : blocage
}
```

Un `sync.Mutex` n'est **pas réentrant** : la même goroutine ne peut pas le verrouiller deux fois. Solution : une méthode interne sans verrou (`afficherSansVerrou`) appelée par les méthodes qui tiennent déjà le verrou.

Deux goroutines qui prennent deux mutex dans un **ordre différent** peuvent aussi s'interbloquer : prenez toujours les verrous dans le **même ordre**.

## Blocage partiel : pas de message {#blocage-partiel}

Le runtime ne détecte le deadlock que si **toutes** les goroutines sont bloquées. Si une seule goroutine reste active (un serveur HTTP qui écoute, un `time.Ticker`…), le programme **se fige sans message**.

Pour diagnostiquer :

- envoyez `SIGQUIT` au programme (`Ctrl+\` dans le terminal) : il affiche la pile de **toutes** les goroutines et l'endroit où chacune est bloquée ;
- ou exposez `net/http/pprof` et consultez `/debug/pprof/goroutine?debug=2`.

## Prévenir {#prevenir}

- Pour chaque channel, sachez **qui envoie, qui reçoit et qui ferme**.
- Fermez les channels côté **émetteur**, avec `defer close(ch)`.
- `defer wg.Done()` en première ligne de chaque goroutine.
- Ajoutez un `select` avec `ctx.Done()` ou un timeout sur les opérations qui pourraient attendre indéfiniment (voir [[select]]).
