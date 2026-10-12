---
title: Quelle différence entre un array et une slice ?
category: faq
order: 3
level: débutant
summary: Un array a une taille fixe qui fait partie de son type et il est copié en entier. Une slice est une vue de taille variable sur un array sous-jacent, légère à copier mais qui partage ses données.
aliases: array vs slice, différence array slice, tableau ou slice, [3]int vs []int, tableau fixe, tableau dynamique, slice ou array
related: arrays, slices, faq-slice-partagee
questions:
  - Quelle est la différence entre un array et une slice en Go ?
  - Quand utiliser un array plutôt qu'une slice ? -> quand-array
---

@@ rapide

```go
a := [3]int{1, 2, 3} // ARRAY : taille dans le type, fixe
s := []int{1, 2, 3}  // SLICE : pas de taille dans le type, extensible

s = append(s, 4) // ✅ une slice grandit
// a = append(a, 4)   // ❌ impossible sur un array

b := a    // copie COMPLÈTE de l'array
b[0] = 99 // a n'est pas modifié

t := s    // copie de l'EN-TÊTE seulement
t[0] = 99 // s[0] vaut aussi 99 !
```

| | Array `[N]T` | Slice `[]T` |
|---|---|---|
| Taille | fixe, connue à la compilation | variable |
| Copie | tous les éléments | l'en-tête (pointeur, len, cap) |
| Comparable `==` | oui | non |
| Usage | rare | partout |

**Dans le doute, utilisez une slice.**

@@ detail

## L'array : une valeur {#array}

```go
var a [4]int
fmt.Printf("%T\n", a) // [4]int
```

- Sa taille fait partie du **type** : une fonction qui attend `[4]int` refuse un `[5]int`.
- C'est une **valeur** : affectation et passage en paramètre **copient** tous les éléments.
- Comparable avec `==` et utilisable comme clé de map.

## La slice : une vue sur un array {#slice}

Une slice est une petite structure de trois champs :

```text
┌──────────┐
│ pointeur │──▶ tableau sous-jacent [1 2 3 _ _]
│ len = 3  │
│ cap = 5  │
└──────────┘
```

- Copier une slice copie ces trois champs : les **données sont partagées**.
- `append` peut faire grandir la slice, en réallouant un tableau plus grand si nécessaire.
- Une slice ne se compare qu'à `nil` (utilisez `slices.Equal`).

## La relation entre les deux {#relation}

Toute slice repose sur un array. On peut d'ailleurs créer une slice **à partir** d'un array :

```go
arr := [5]int{10, 20, 30, 40, 50}
s := arr[1:4] // [20 30 40], partage la mémoire de arr
s[0] = 99
fmt.Println(arr) // [10 99 30 40 50]
```

Et convertir une slice en array (Go 1.20+), ce qui **copie** les données :

```go
s := []int{1, 2, 3, 4}
a := [4]int(s) // panic si len(s) < 4
```

## Dans les fonctions {#fonctions}

```go
func modifierArray(a [3]int) { a[0] = 100 } // modifie une copie
func modifierSlice(s []int)  { s[0] = 100 } // modifie les données partagées

a := [3]int{1, 2, 3}
s := []int{1, 2, 3}
modifierArray(a)
modifierSlice(s)
fmt.Println(a, s) // [1 2 3] [100 2 3]
```

## Quand utiliser un array ? {#quand-array}

- La taille est **fixe par nature** : coordonnées `[3]float64`, couleur RVB `[3]uint8`, plateau de jeu `[8][8]Piece`.
- Comme **clé de map** : `map[[2]int]bool`.
- Les empreintes cryptographiques : `sha256.Sum256` renvoie un `[32]byte`.
- Pour garantir une **copie** indépendante sans y penser.

Dans tous les autres cas : slice. Voir [[arrays]] et [[slices]].
