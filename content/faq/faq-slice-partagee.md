---
title: Pourquoi modifier une slice modifie aussi l'autre ?
category: faq
order: 13
level: intermédiaire
summary: Deux slices obtenues par affectation ou découpage partagent le même tableau sous-jacent. Modifier l'une modifie l'autre. Pour une copie indépendante, utilisez slices.Clone ou copy.
aliases: slice partagée, slice modifiée, copie de slice, copier une slice, slice reference, shared slice, aliasing, effet de bord slice, append modifie l'original, sous-slice, clone
related: slices, faq-array-vs-slice, faq-supprimer-element
questions:
  - Pourquoi ma slice est-elle modifiée alors que j'ai modifié une copie ?
  - Comment copier une slice de façon indépendante ? -> copier
  - Pourquoi append modifie-t-il parfois l'original ? -> append
---

@@ rapide

```go
a := []int{1, 2, 3}
b := a // b n'est PAS une copie des données
b[0] = 99
fmt.Println(a) // [99 2 3] ⚠️

c := slices.Clone(a) // ✅ vraie copie (Go 1.21+)
c[0] = 0
fmt.Println(a) // [99 2 3] : intact
```

Une slice n'est qu'un **en-tête** (pointeur, longueur, capacité) vers un tableau. `b := a` et `b := a[1:]` copient l'en-tête, pas le tableau : les deux slices voient les **mêmes** éléments.

@@ detail

## Ce qui se passe en mémoire {#memoire}

```text
a := []int{1, 2, 3, 4, 5}
b := a[1:3]

a ──▶ ┌───┬───┬───┬───┬───┐
      │ 1 │ 2 │ 3 │ 4 │ 5 │   un seul tableau
b ──────▶ └───┴───┘
          len(b)=2, cap(b)=4
```

`b[0]` et `a[1]` sont **la même case mémoire**. C'est voulu : découper est gratuit, sans copie.

## Copier pour de vrai {#copier}

```go
src := []int{1, 2, 3}

// 1. slices.Clone (le plus lisible)
c1 := slices.Clone(src)

// 2. copy dans une slice de la bonne longueur
c2 := make([]int, len(src))
copy(c2, src)

// 3. append sur une slice vide
c3 := append([]int(nil), src...)
```

:::warning Copie superficielle
Ces copies sont **superficielles** : pour une slice de pointeurs, de slices ou de maps, les éléments copiés pointent toujours vers les mêmes données. Pour une copie profonde, il faut copier chaque élément.
:::

## Le piège d'append {#append}

`append` écrit dans le tableau existant **s'il reste de la capacité**. Ajouter à une sous-slice peut donc écraser des éléments de l'original :

```go
a := []int{1, 2, 3, 4, 5}
debut := a[:2]             // [1 2], cap = 5
debut = append(debut, 100) // écrit dans a[2] !
fmt.Println(a)             // [1 2 100 4 5]
```

Et le comportement **change** selon la capacité, ce qui rend le bug intermittent :

```go
x := make([]int, 3, 3)
y := append(x, 4) // capacité épuisée : nouveau tableau
y[0] = 99
fmt.Println(x[0]) // 0 : x n'est pas affecté cette fois
```

**Solutions** :

```go
debut := a[:2:2]            // limiter la capacité : append réallouera
debut = slices.Clone(a[:2]) // ou travailler sur une copie
```

## Dans les fonctions {#fonctions}

Une fonction qui reçoit une slice peut modifier les éléments de l'appelant :

```go
func normaliser(notes []float64) {
	for i := range notes {
		notes[i] = notes[i] / 20 // modifie la slice de l'appelant
	}
}
```

Si ce n'est pas l'intention, la fonction doit travailler sur une copie, ou le documenter clairement. À l'inverse, pour qu'une fonction **ajoute** des éléments visibles par l'appelant, elle doit **renvoyer** la nouvelle slice (comme `append`).

## Les maps aussi {#maps}

Une map est également une référence : `m2 := m1` ne copie rien. Utilisez `maps.Clone(m1)` pour une copie.

## Les arrays, eux, sont copiés {#arrays}

```go
a := [3]int{1, 2, 3}
b := a // copie complète
b[0] = 99
fmt.Println(a) // [1 2 3]
```

Voir [[faq-array-vs-slice]] et [[slices#partage]].
