---
title: Channels
category: concurrence
order: 2
level: intermédiaire
summary: Un channel (chan T) est un tuyau typé qui permet aux goroutines d'échanger des valeurs et de se synchroniser. ch <- v envoie, v := <-ch reçoit, close(ch) signale la fin. Sans tampon, l'envoi attend la réception.
aliases: channel, channels, chan, canal, canaux, tuyau, pipe, file, queue, message, envoyer, recevoir, <-, buffered, unbuffered, tampon, buffer, close, fermer un channel, range channel, channel directionnel, chan<-, <-chan, deadlock, producteur consommateur
related: goroutines, select, sync, patterns-concurrence, faq-deadlock, context
questions:
  - Qu'est-ce qu'un channel en Go ?
  - Quelle différence entre channel avec et sans tampon (buffered) ? -> tampon
  - Comment fermer un channel et qui doit le fermer ? -> fermer
  - Comment savoir si un channel est fermé ? -> fermer
  - Comment parcourir un channel avec range ? -> range
  - Que sont les channels directionnels (chan<- et <-chan) ? -> directionnels
  - Que se passe-t-il avec un channel nil ? -> regles
---

@@ rapide

```go
ch := make(chan int) // channel non bufferisé de int

go func() {
	for i := range 3 {
		ch <- i // ENVOI : bloque jusqu'à ce que quelqu'un reçoive
	}
	close(ch) // plus rien ne sera envoyé
}()

for v := range ch { // RÉCEPTION jusqu'à la fermeture
	fmt.Println(v) // 0 1 2
}

buf := make(chan string, 10) // channel avec un tampon de 10 places
v, ok := <-ch                // ok == false : channel fermé et vide
```

- **Sans tampon** : envoi et réception se donnent rendez-vous (synchronisation).
- **Avec tampon** : l'envoi ne bloque que si le tampon est plein.
- C'est l'**émetteur** qui ferme le channel, jamais le récepteur.
- Envoyer sur un channel fermé provoque un **panic** ; recevoir depuis un channel fermé renvoie la valeur zéro.

@@ detail

## Créer et utiliser un channel {#bases}

```go
var ch chan int     // nil : inutilisable tel quel
ch = make(chan int) // channel prêt à l'emploi

ch <- 42  // envoyer
v := <-ch // recevoir et garder la valeur
<-ch      // recevoir et ignorer la valeur
```

Un channel est **typé** : `chan int` ne transporte que des `int`. On peut transporter n'importe quoi : `chan string`, `chan error`, `chan Resultat`, `chan struct{}` (pour un simple signal), et même `chan chan int`.

## Sans tampon : le rendez-vous {#sans-tampon}

Un channel créé avec `make(chan T)` n'a **aucune capacité** : un envoi bloque jusqu'à ce qu'un récepteur soit prêt, et inversement. Les deux goroutines sont **synchronisées** à cet instant.

```go
func main() {
	fait := make(chan bool)
	go func() {
		fmt.Println("travail…")
		time.Sleep(500 * time.Millisecond)
		fait <- true // bloque jusqu'à la réception dans main
	}()
	<-fait // main attend ici
	fmt.Println("terminé")
}
```

## Avec tampon (buffered) {#tampon}

```go
ch := make(chan string, 2) // capacité 2
ch <- "a"                  // ne bloque pas
ch <- "b"                  // ne bloque pas
// ch <- "c"               // bloquerait : tampon plein
fmt.Println(len(ch), cap(ch)) // 2 2
fmt.Println(<-ch)             // "a" (ordre FIFO)
```

| | Sans tampon `make(chan T)` | Avec tampon `make(chan T, n)` |
|---|---|---|
| L'envoi bloque si… | aucun récepteur n'est prêt | le tampon est plein |
| La réception bloque si… | aucun émetteur n'est prêt | le tampon est vide |
| Garantie | la valeur a été **reçue** quand l'envoi se termine | la valeur est **déposée** |
| Usage | synchronisation, passage de relais | absorber des pics, limiter la concurrence (sémaphore) |

:::tip Taille du tampon
Ne mettez pas un grand tampon « pour éviter les blocages » : vous masqueriez un problème de conception. Un tampon de 0 ou 1 est le cas général ; une taille plus grande doit être justifiée (nombre connu de résultats, sémaphore…).
:::

## Fermer un channel {#fermer}

`close(ch)` signale qu'**aucune valeur ne sera plus envoyée**. Les récepteurs peuvent encore lire les valeurs restant dans le tampon, puis reçoivent la **valeur zéro** immédiatement.

```go
ch := make(chan int, 2)
ch <- 1
close(ch)

v, ok := <-ch
fmt.Println(v, ok) // 1 true   : une valeur restait dans le tampon
v, ok = <-ch
fmt.Println(v, ok) // 0 false  : fermé et vide
```

Règles :

- C'est **l'émetteur** qui ferme : il est le seul à savoir qu'il n'enverra plus rien.
- Avec plusieurs émetteurs, aucun ne peut fermer seul : on utilise un `sync.WaitGroup` et une goroutine dédiée qui ferme après `wg.Wait()` (voir [[patterns-concurrence#fan-in]]).
- Fermer n'est **pas obligatoire** : un channel non fermé est récupéré par le ramasse-miettes. On ferme pour **prévenir** les récepteurs (fin d'un `range`).

## Parcourir avec range {#range}

```go
func generer(n int) <-chan int {
	ch := make(chan int)
	go func() {
		defer close(ch) // indispensable, sinon le range ne se termine jamais
		for i := range n {
			ch <- i * i
		}
	}()
	return ch
}

for carre := range generer(5) {
	fmt.Println(carre) // 0 1 4 9 16
}
```

`for v := range ch` reçoit jusqu'à ce que le channel soit **fermé et vide**.

## Les channels directionnels {#directionnels}

Dans une signature, on peut restreindre un channel à l'envoi ou à la réception. Le compilateur vérifie alors qu'il est utilisé correctement :

```go
func producteur(sortie chan<- int) {  // envoi uniquement
	sortie <- 1
	// <-sortie  ❌ invalid operation: cannot receive from send-only channel
}

func consommateur(entree <-chan int) { // réception uniquement
	v := <-entree
	fmt.Println(v)
	// close(entree) ❌ on ne peut pas fermer un channel en réception seule
}

ch := make(chan int)  // bidirectionnel, converti automatiquement
go producteur(ch)
consommateur(ch)
```

Moyen mnémotechnique : la flèche indique le sens du flux par rapport au mot `chan`. `chan<-` : les données **entrent** dans le channel ; `<-chan` : elles en **sortent**.

## Tableau des règles {#regles}

| Opération | channel nil | channel ouvert | channel fermé |
|---|---|---|---|
| Envoyer `ch <- v` | bloque pour toujours | envoie (ou bloque) | **panic** |
| Recevoir `<-ch` | bloque pour toujours | reçoit (ou bloque) | valeur zéro, `ok == false` (après le tampon) |
| Fermer `close(ch)` | **panic** | ferme | **panic** |
| `len(ch)` | 0 | éléments en attente | éléments restants |

Le comportement des channels nil est utile dans un `select` pour **désactiver** un cas (voir [[select#channel-nil]]).

## Le deadlock {#deadlock}

Si toutes les goroutines sont bloquées, le runtime arrête le programme :

```go
func main() {
	ch := make(chan int)
	ch <- 1 // personne ne reçoit : main bloque pour toujours
}
```

```text
fatal error: all goroutines are asleep - deadlock!
```

Voir [[faq-deadlock]] pour les causes classiques et leurs solutions.

## Exemple : producteur / consommateur {#producteur-consommateur}

```go
type Commande struct {
	ID    int
	Total float64
}

func main() {
	commandes := make(chan Commande, 5)
	var wg sync.WaitGroup

	// 3 consommateurs
	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for c := range commandes {
				fmt.Printf("préparateur %d : commande %d (%.2f €)\n", w, c.ID, c.Total)
			}
		}()
	}

	// 1 producteur
	for i := 1; i <= 9; i++ {
		commandes <- Commande{ID: i, Total: float64(i) * 9.9}
	}
	close(commandes) // les consommateurs sortent de leur range

	wg.Wait()
}
```

## Channel de signal : chan struct{} {#signal}

Pour un simple signal, sans donnée, on utilise `chan struct{}` (zéro octet). Fermer le channel **diffuse** le signal à **tous** les récepteurs d'un coup :

```go
stop := make(chan struct{})

for i := range 3 {
	go func() {
		<-stop // toutes les goroutines attendent ici
		fmt.Println("arrêt", i)
	}()
}

close(stop) // réveille les 3 goroutines en même temps
```

C'est le principe de `ctx.Done()` dans le package [[context]].
