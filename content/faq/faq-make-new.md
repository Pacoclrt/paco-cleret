---
title: Quelle différence entre make et new ?
category: faq
order: 14
level: intermédiaire
summary: make initialise et renvoie une slice, une map ou un channel prêt à l'emploi. new(T) alloue une valeur zéro de n'importe quel type et renvoie un pointeur *T. En pratique, new est rare : on écrit plutôt &T{}.
aliases: make, new, make vs new, différence make new, allocation, allouer, initialiser une map, initialiser une slice, créer un channel, &T{}, pointeur vers struct
related: slices, maps, channels, pointeurs, structs
questions:
  - Quand utiliser make et quand utiliser new ?
  - Pourquoi new(map[string]int) ne fonctionne pas ? -> new-map
---

@@ rapide

| | `make(T, args)` | `new(T)` |
|---|---|---|
| Pour | slices, maps, channels **uniquement** | n'importe quel type |
| Renvoie | `T` initialisé, prêt à l'emploi | `*T` pointant vers une valeur zéro |
| Exemple | `make([]int, 0, 10)` | `new(int)` |

```go
s := make([]int, 5)       // []int de 5 zéros
m := make(map[string]int) // map vide, utilisable
c := make(chan int, 3)    // channel avec tampon de 3

p := new(int) // *int → 0
*p = 42

u := &Utilisateur{Nom: "Ada"} // forme idiomatique, préférée à new(Utilisateur)
```

@@ detail

## make : construire les types internes {#make}

Les slices, maps et channels ont une structure interne (tableau, table de hachage, file d'attente) qui doit être **initialisée**. `make` le fait :

```go
make([]T, longueur)           // slice de longueur éléments à zéro
make([]T, longueur, capacite) // avec une capacité réservée
make(map[K]V)                 // map vide
make(map[K]V, taille)         // avec une taille initiale indicative
make(chan T)                  // channel sans tampon
make(chan T, n)               // channel avec tampon de n
```

`make` renvoie la valeur elle-même (pas un pointeur), car ces types contiennent déjà un pointeur interne.

## new : allouer une valeur zéro {#new}

`new(T)` alloue un `T` initialisé à sa valeur zéro et renvoie son **adresse** :

```go
p := new(int)   // p est un *int, *p vaut 0
q := new(Point) // q est un *Point, *q vaut Point{0, 0}
```

C'est équivalent à :

```go
var x int
p := &x
```

En pratique, on utilise presque toujours un **littéral composite** avec `&`, plus lisible et qui permet d'initialiser des champs :

```go
q := &Point{X: 1, Y: 2}
```

## Pourquoi new(map[…]) ne fonctionne pas {#new-map}

```go
m := new(map[string]int) // *map[string]int vers une map nil
(*m)["a"] = 1            // ❌ panic: assignment to entry in nil map
```

`new` crée un pointeur vers la **valeur zéro** d'une map, c'est-à-dire `nil`. La map n'est pas initialisée. Utilisez `make(map[string]int)` ou `map[string]int{}`.

## Les littéraux, une troisième voie {#litteraux}

```go
s := []int{} // slice vide (non nil)
s2 := []int{1, 2, 3}
m := map[string]int{} // map vide
m2 := map[string]int{"a": 1}
```

| Besoin | Écriture idiomatique |
|---|---|
| slice avec des valeurs connues | `[]int{1, 2, 3}` |
| slice dont on connaît la taille finale | `make([]int, 0, n)` |
| map vide | `map[K]V{}` ou `make(map[K]V)` |
| channel | `make(chan T)` (seule option) |
| pointeur vers une struct | `&T{…}` |
| pointeur vers un type de base | `new(int)` (rare) |

Voir [[pointeurs#creer]] et [[slices#creer]].
