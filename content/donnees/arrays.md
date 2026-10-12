---
title: Tableaux (arrays)
category: donnees
order: 1
level: débutant
summary: Un array a une taille fixe qui fait partie de son type ([3]int ≠ [4]int). Il est copié à chaque affectation. En pratique, on utilise surtout des slices.
aliases: array, arrays, tableau, tableaux, tableau fixe, taille fixe, [n]t, matrice, tableau à deux dimensions, 2d, multidimensionnel, [...]
related: slices, faq-array-vs-slice, for
questions:
  - Qu'est-ce qu'un array (tableau) en Go ?
  - Quelle différence entre un array et une slice ? -> array-ou-slice
  - Comment créer un tableau à deux dimensions ? -> multidimensionnels
  - Pourquoi modifier un tableau dans une fonction ne change pas l'original ? -> copie
---

@@ rapide

```go
var notes [3]int                 // [0 0 0] : taille fixe de 3
jours := [7]string{"lun", "mar"} // les autres éléments valent ""
premiers := [...]int{2, 3, 5, 7} // taille déduite : [4]int

notes[0] = 15
fmt.Println(len(notes)) // 3
```

- La **taille fait partie du type** : `[3]int` et `[4]int` sont deux types différents.
- Un array est une **valeur** : l'affecter ou le passer à une fonction **copie tous ses éléments**.
- Sa taille est fixée à la **compilation** et ne change jamais.
- Dans 95 % des cas, on utilise une [[slices|slice]] (taille dynamique) à la place.

@@ detail

## Déclarer un array {#declarer}

```go
var a [5]int // [0 0 0 0 0]
b := [3]string{"go", "rust", "zig"}
c := [...]float64{1.5, 2.5} // le compilateur compte : [2]float64
d := [5]int{1: 10, 3: 30}   // indices explicites : [0 10 0 30 0]
```

La taille doit être une **constante** connue à la compilation :

```go
n := 5
var e [n]int // ❌ array length n (variable of type int) must be constant
const N = 5
var f [N]int // ✅
```

## Accès et parcours {#acces}

```go
a := [4]int{10, 20, 30, 40}
fmt.Println(a[0], a[len(a)-1]) // 10 40
a[2] = 99

for i, v := range a {
	fmt.Println(i, v)
}
```

Un accès hors limites avec un indice **constant** est refusé à la compilation ; avec un indice **variable**, il provoque un `panic: runtime error: index out of range`.

## Un array est une valeur (copie) {#copie}

C'est la grande différence avec beaucoup d'autres langages : un array Go **n'est pas une référence**.

```go
a := [3]int{1, 2, 3}
b := a        // copie COMPLÈTE
b[0] = 100
fmt.Println(a) // [1 2 3]  : a n'a pas changé
fmt.Println(b) // [100 2 3]

func doubler(t [3]int) {
	for i := range t {
		t[i] *= 2 // modifie la copie locale
	}
}
doubler(a)
fmt.Println(a) // [1 2 3]
```

Pour modifier l'original, passez un **pointeur** (`*[3]int`), ou mieux : utilisez une slice.

```go
func doubler(t *[3]int) {
	for i := range t {
		t[i] *= 2 // indexation automatique à travers le pointeur
	}
}
doubler(&a)
```

:::warning Gros tableaux
Copier un `[1000000]int` coûte 8 Mo à chaque appel de fonction. Pour de grandes données, utilisez une slice ou un pointeur.
:::

## Comparer des arrays {#comparer}

Les arrays de types comparables se comparent avec `==` élément par élément :

```go
fmt.Println([2]int{1, 2} == [2]int{1, 2}) // true
```

Ils peuvent donc servir de **clé de map**, ce qui est pratique pour des coordonnées :

```go
visites := map[[2]int]bool{}
visites[[2]int{3, 4}] = true
```

## Tableaux multidimensionnels {#multidimensionnels}

```go
var grille [3][3]rune // 3 lignes de 3 colonnes

for i := range grille {
	for j := range grille[i] {
		grille[i][j] = '.'
	}
}
grille[1][1] = 'X'

for _, ligne := range grille {
	fmt.Println(string(ligne[:]))
}
```

```output
...
.X.
...
```

`ligne[:]` crée une slice à partir de l'array, nécessaire pour la conversion en string.

## Array ou slice ? {#array-ou-slice}

| | Array `[N]T` | Slice `[]T` |
|---|---|---|
| Taille | fixe, dans le type | dynamique |
| Affectation | copie tous les éléments | copie l'en-tête, partage les données |
| Comparable avec `==` | oui | non (seulement à `nil`) |
| Clé de map | oui | non |
| Usage | tailles connues (coordonnées, hash `[32]byte`, buffers fixes) | presque tout le reste |

Une slice est d'ailleurs construite **au-dessus** d'un array. Détails dans [[faq-array-vs-slice]].

```go
hash := sha256.Sum256([]byte("go")) // renvoie un [32]byte
fmt.Printf("%x\n", hash[:])         // conversion en slice pour l'afficher
```
