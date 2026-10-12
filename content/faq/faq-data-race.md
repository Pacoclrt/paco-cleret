---
title: Qu'est-ce qu'une data race et comment l'éviter ?
category: faq
order: 8
level: avancé
summary: Une data race survient quand deux goroutines accèdent à la même variable en même temps, dont au moins une en écriture, sans synchronisation. Le résultat est imprévisible. On les détecte avec -race et on les évite avec un mutex, des opérations atomiques ou des channels.
aliases: data race, race condition, condition de course, accès concurrent, -race, race detector, détecteur de race, concurrent map writes, variable partagée, thread safe, thread-safe, goroutine safe
related: sync, goroutines, channels, faq-attendre-goroutines
questions:
  - Qu'est-ce qu'une data race en Go ?
  - Comment détecter une data race ? -> detecter
  - Comment corriger une data race ? -> corriger
  - Pourquoi « fatal error concurrent map writes » ? -> maps
---

@@ rapide

```go
compteur := 0
var wg sync.WaitGroup
for range 1000 {
	wg.Add(1)
	go func() {
		defer wg.Done()
		compteur++ // ❌ DATA RACE : lecture + modification + écriture non atomiques
	}()
}
wg.Wait()
fmt.Println(compteur) // 1000 ? 974 ? 991 ? imprévisible
```

**Détecter** : `go run -race .` ou `go test -race ./...`

**Corriger** (au choix) :

```go
var mu sync.Mutex // 1. un mutex
mu.Lock()
compteur++
mu.Unlock()

var c atomic.Int64 // 2. une opération atomique
c.Add(1)

// 3. ne pas partager : chaque goroutine envoie son résultat sur un channel
```

@@ detail

## Pourquoi compteur++ pose problème {#explication}

`compteur++` n'est pas une opération indivisible. Le processeur fait trois étapes :

```text
1. lire compteur        (ex. 41)
2. calculer 41 + 1
3. écrire 42
```

Si deux goroutines s'entrelacent :

```text
goroutine A : lit 41
goroutine B : lit 41
goroutine A : écrit 42
goroutine B : écrit 42      ← un incrément est perdu
```

Pire : en cas de data race, le modèle mémoire de Go ne garantit **rien** sur ce qu'une goroutine voit des écritures d'une autre. Le comportement peut changer selon le processeur, l'optimisation du compilateur ou la charge.

## Détecter avec -race {#detecter}

Le **détecteur de races** instrumente le programme et signale les accès concurrents réellement exécutés :

```bash
go run -race .
go test -race ./...
go build -race -o app-race .
```

```text
==================
WARNING: DATA RACE
Read at 0x00c000014108 by goroutine 8:
  main.main.func1()
      /app/main.go:14 +0x6c

Previous write at 0x00c000014108 by goroutine 7:
  main.main.func1()
      /app/main.go:14 +0x84
==================
```

Le rapport indique les **deux accès en conflit** avec leur ligne. Le détecteur ne trouve que les races qui **se produisent** pendant l'exécution : lancez-le sur vos tests, idéalement en intégration continue. Il ralentit le programme (2 à 10 fois) : ne l'utilisez pas en production.

## Corriger {#corriger}

### 1. Un mutex

```go
type Compteur struct {
	mu sync.Mutex
	n  int
}

func (c *Compteur) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
}

func (c *Compteur) Valeur() int {
	c.mu.Lock() // la lecture aussi doit être protégée !
	defer c.mu.Unlock()
	return c.n
}
```

### 2. Une opération atomique

Pour un simple compteur ou drapeau :

```go
var n atomic.Int64
n.Add(1)
fmt.Println(n.Load())
```

### 3. Ne pas partager

Chaque goroutine calcule de son côté et transmet son résultat :

```go
res := make(chan int)
for _, part := range parts {
	go func() { res <- somme(part) }()
}
total := 0
for range parts {
	total += <-res // une seule goroutine (main) modifie total
}
```

Ou chaque goroutine écrit dans **sa propre case** d'une slice (indices distincts = pas de race).

## Le cas des maps {#maps}

Les maps ne supportent pas les écritures concurrentes. Le runtime détecte souvent le problème et arrête **brutalement** le programme (impossible à rattraper avec `recover`) :

```text
fatal error: concurrent map writes
fatal error: concurrent map read and map write
```

Protégez la map avec un `sync.Mutex` ou `sync.RWMutex` (voir [[sync#rwmutex]]), ou utilisez `sync.Map` dans les cas adaptés.

## Les races « bénignes » n'existent pas {#benignes}

« Ce n'est qu'un booléen, ça ne peut pas mal tourner » : si, le compilateur peut par exemple garder la valeur dans un registre et ne jamais voir la mise à jour d'une autre goroutine. Toute race est un bug : utilisez `atomic.Bool`.

## Race condition ou data race ? {#race-condition}

- Une **data race** est un accès mémoire concurrent non synchronisé (détectable par `-race`).
- Une **race condition** est un bug logique dû à l'ordre des événements, même avec une synchronisation correcte (vérifier puis agir : `if solde >= m { solde -= m }` en deux sections critiques séparées).

La correction de la seconde consiste à faire la vérification **et** l'action dans la **même** section critique.
