---
title: select
category: concurrence
order: 3
level: intermédiaire
summary: select attend sur plusieurs opérations de channel et exécute la première prête. Avec time.After, il implémente un timeout ; avec default, une opération non bloquante ; avec ctx.Done(), l'annulation.
aliases: select, case, attendre plusieurs channels, multiplexer, timeout, délai, time.after, non bloquant, non-blocking, default, boucle select, for select, annulation, quit, done
related: channels, goroutines, context, time, faq-timeout
questions:
  - À quoi sert select en Go ?
  - Comment ajouter un timeout à une réception sur un channel ? -> timeout
  - Comment envoyer ou recevoir sans bloquer ? -> non-bloquant
  - Comment arrêter une goroutine qui tourne en boucle ? -> boucle-select
  - Que se passe-t-il si plusieurs cases sont prêtes ? -> choix-aleatoire
---

@@ rapide

```go
select {
case msg := <-messages: // réception
	fmt.Println("reçu :", msg)
case resultats <- calcul: // envoi
	fmt.Println("envoyé")
case <-time.After(2 * time.Second): // timeout
	fmt.Println("trop long !")
case <-ctx.Done(): // annulation
	return ctx.Err()
}
```

- `select` **bloque** jusqu'à ce qu'**un** des cas soit prêt, puis exécute ce cas uniquement.
- Si **plusieurs** sont prêts, il en choisit un **au hasard**.
- Avec un cas **`default`**, `select` ne bloque jamais (exécute `default` si rien n'est prêt).
- On l'utilise presque toujours dans une boucle `for { select { … } }`.

@@ detail

## Syntaxe {#syntaxe}

`select` ressemble à un `switch`, mais chaque `case` est une **opération de channel** (envoi ou réception) :

```go
select {
case v := <-ch1:
	fmt.Println("ch1 :", v)
case v, ok := <-ch2:
	if !ok {
		fmt.Println("ch2 fermé")
	}
case ch3 <- 42:
	fmt.Println("42 envoyé sur ch3")
}
```

Toutes les expressions des `case` (les channels et les valeurs à envoyer) sont évaluées **une fois**, à l'entrée du `select`.

## Choix aléatoire {#choix-aleatoire}

```go
a := make(chan string, 1)
b := make(chan string, 1)
a <- "A"
b <- "B"

select {
case v := <-a:
	fmt.Println(v)
case v := <-b:
	fmt.Println(v)
}
// Affiche A ou B, au hasard
```

Le choix aléatoire garantit qu'aucun channel n'est **affamé** (toujours ignoré au profit d'un autre). Ne comptez donc **jamais** sur l'ordre des `case` comme priorité.

## Timeout {#timeout}

`time.After(d)` renvoie un channel qui recevra une valeur après la durée `d`. Combiné à `select`, c'est un timeout :

```go
func appelAvecTimeout() (string, error) {
	res := make(chan string, 1) // tampon de 1 : la goroutine pourra toujours envoyer et se terminer
	go func() {
		res <- appelLent()
	}()

	select {
	case r := <-res:
		return r, nil
	case <-time.After(3 * time.Second):
		return "", errors.New("délai dépassé")
	}
}
```

:::warning Le tampon de 1
Sans tampon, si le timeout se déclenche, la goroutine resterait bloquée à jamais sur `res <- …` (personne ne lit plus) : c'est une fuite de goroutine.
:::

En pratique, on préfère souvent un `context.WithTimeout`, qui se propage aussi aux fonctions appelées. Voir [[faq-timeout]].

## Opérations non bloquantes {#non-bloquant}

Avec `default`, `select` n'attend pas :

```go
// Réception non bloquante
select {
case msg := <-messages:
	fmt.Println("message :", msg)
default:
	fmt.Println("aucun message pour l'instant")
}

// Envoi non bloquant : abandonner si le tampon est plein
select {
case evenements <- e:
default:
	log.Println("file pleine, événement perdu")
}
```

## La boucle for-select {#boucle-select}

Une goroutine de longue durée tourne généralement dans une boucle `for` contenant un `select`, avec un cas qui permet de l'**arrêter** :

```go
func surveiller(ctx context.Context, mesures <-chan float64) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	var derniere float64
	for {
		select {
		case <-ctx.Done(): // demande d'arrêt
			fmt.Println("arrêt :", ctx.Err())
			return
		case m := <-mesures: // nouvelle mesure
			derniere = m
		case <-ticker.C: // chaque seconde
			fmt.Printf("dernière mesure : %.1f\n", derniere)
		}
	}
}
```

Rappel : `break` dans un `select` ne sort que du `select`. Pour quitter la boucle, utilisez `return` ou un label.

## Désactiver un cas avec un channel nil {#channel-nil}

Une opération sur un channel `nil` bloque pour toujours, donc un `case` sur un channel nil n'est **jamais choisi**. On s'en sert pour désactiver dynamiquement un cas, par exemple quand un channel est fermé :

```go
func fusionner(a, b <-chan int) <-chan int {
	sortie := make(chan int)
	go func() {
		defer close(sortie)
		for a != nil || b != nil {
			select {
			case v, ok := <-a:
				if !ok {
					a = nil // a est épuisé : on ne l'écoute plus
					continue
				}
				sortie <- v
			case v, ok := <-b:
				if !ok {
					b = nil
					continue
				}
				sortie <- v
			}
		}
	}()
	return sortie
}
```

## Le select vide {#vide}

`select {}` bloque **pour toujours**. On le voit parfois à la fin d'un `main` dont tout le travail se fait dans des goroutines (même si attendre un signal d'arrêt est plus propre).

## Battement régulier : time.Ticker {#ticker}

```go
ticker := time.NewTicker(500 * time.Millisecond)
defer ticker.Stop()
timeout := time.After(2 * time.Second)

for {
	select {
	case t := <-ticker.C:
		fmt.Println("tic", t.Format("15:04:05.000"))
	case <-timeout:
		fmt.Println("fin")
		return
	}
}
```

Voir aussi [[time]].
