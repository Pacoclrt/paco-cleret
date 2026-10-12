---
title: Comment supprimer un élément d'une slice ?
category: faq
order: 11
level: débutant
summary: slices.Delete(s, i, i+1) supprime l'élément d'indice i en gardant l'ordre. slices.DeleteFunc supprime tous les éléments qui vérifient une condition. Toujours réaffecter le résultat : s = slices.Delete(…).
aliases: supprimer un élément, retirer un élément, enlever un élément, delete slice, remove slice, splice, effacer, filtrer une slice, supprimer les doublons, supprimer pendant un parcours, pop
related: slices, faq-slice-partagee, faq-element-slice
questions:
  - Comment supprimer un élément d'une slice en Go ?
  - Comment supprimer un élément sans garder l'ordre (plus rapide) ? -> sans-ordre
  - Comment supprimer tous les éléments qui vérifient une condition ? -> condition
  - Comment supprimer les doublons d'une slice ? -> doublons
  - Comment supprimer des éléments pendant un parcours ? -> pendant-parcours
---

@@ rapide

```go
s := []string{"a", "b", "c", "d"}

// Supprimer l'indice 1 en gardant l'ordre
s = slices.Delete(s, 1, 2) // [a c d]

// Supprimer selon une condition
nombres := []int{1, 2, 3, 4, 5, 6}
nombres = slices.DeleteFunc(nombres, func(n int) bool {
	return n%2 == 0 // supprime les pairs
}) // [1 3 5]

// Sans le package slices
i := 1
s = append(s[:i], s[i+1:]...)
```

Ces opérations **modifient le tableau sous-jacent** : réaffectez toujours le résultat (`s = …`), et attention si d'autres slices partagent la même mémoire.

@@ detail

## Supprimer un indice en gardant l'ordre {#avec-ordre}

```go
s := []int{10, 20, 30, 40, 50}
s = slices.Delete(s, 2, 3) // supprime l'intervalle [2, 3) → [10 20 40 50]
s = slices.Delete(s, 0, 2) // supprime les deux premiers   → [40 50]
```

Version manuelle avec `append` :

```go
func SupprimerIndice[T any](s []T, i int) []T {
	return append(s[:i], s[i+1:]...)
}
```

`append(s[:i], s[i+1:]...)` décale tous les éléments suivants d'une case vers la gauche, dans le **même** tableau. Coût : `O(n)`.

:::warning L'original est modifié
```go
a := []int{1, 2, 3, 4}
b := slices.Delete(a, 0, 1)
fmt.Println(b) // [2 3 4]
fmt.Println(a) // [2 3 4 0] : a partage le tableau (slices.Delete met à zéro la fin)
```
Si vous avez besoin de garder l'original, travaillez sur une copie : `slices.Delete(slices.Clone(a), 0, 1)`. Voir [[faq-slice-partagee]].
:::

## Supprimer sans garder l'ordre (rapide) {#sans-ordre}

Si l'ordre n'importe pas, remplacez l'élément par le dernier puis raccourcissez : `O(1)`.

```go
func SupprimerRapide[T any](s []T, i int) []T {
	s[i] = s[len(s)-1]
	return s[:len(s)-1]
}

s := []string{"a", "b", "c", "d"}
s = SupprimerRapide(s, 1) // [a d c]
```

## Supprimer selon une condition {#condition}

```go
type Tache struct {
	Titre string
	Fait  bool
}

taches = slices.DeleteFunc(taches, func(t Tache) bool {
	return t.Fait // retire les tâches terminées
})
```

Version manuelle, qui **filtre sur place** sans allouer :

```go
func Filtrer[T any](s []T, garder func(T) bool) []T {
	n := 0
	for _, v := range s {
		if garder(v) {
			s[n] = v
			n++
		}
	}
	return s[:n]
}
```

## Supprimer une valeur précise {#valeur}

```go
s := []string{"go", "rust", "zig"}
if i := slices.Index(s, "rust"); i >= 0 {
	s = slices.Delete(s, i, i+1) // [go zig]
}

// Toutes les occurrences
s = slices.DeleteFunc(s, func(v string) bool { return v == "rust" })
```

## Supprimer les doublons {#doublons}

Si l'ordre peut changer : trier puis compacter.

```go
s := []int{3, 1, 3, 2, 1}
slices.Sort(s)        // [1 1 2 3 3]
s = slices.Compact(s) // [1 2 3] : supprime les doublons CONSÉCUTIFS
```

En gardant l'ordre d'origine : une map des éléments déjà vus.

```go
func SansDoublons[T comparable](s []T) []T {
	vus := make(map[T]struct{}, len(s))
	res := s[:0] // réutilise le tableau
	for _, v := range s {
		if _, ok := vus[v]; !ok {
			vus[v] = struct{}{}
			res = append(res, v)
		}
	}
	return res
}
```

## Pendant un parcours {#pendant-parcours}

Supprimer dans une boucle `for … range` sur la même slice décale les indices et fait sauter des éléments. Solutions :

```go
// 1. DeleteFunc (le plus simple)
s = slices.DeleteFunc(s, aSupprimer)

// 2. Parcourir à l'envers
for i := len(s) - 1; i >= 0; i-- {
	if aSupprimer(s[i]) {
		s = slices.Delete(s, i, i+1)
	}
}
```

## Retirer le premier ou le dernier élément {#pop}

```go
pile := []int{1, 2, 3}
dernier := pile[len(pile)-1]
pile = pile[:len(pile)-1] // pop : [1 2]

file := []int{1, 2, 3}
premier := file[0]
file = file[1:] // shift : [2 3]
```

:::info Libérer la mémoire
Raccourcir une slice de **pointeurs** garde les éléments retirés vivants dans le tableau sous-jacent. `slices.Delete` met ces cases à la valeur zéro (Go 1.22+) pour que le ramasse-miettes puisse les libérer ; avec la version manuelle, faites-le vous-même (`s[len(s)-1] = nil` avant de raccourcir).
:::
