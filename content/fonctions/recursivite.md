---
title: Récursivité
category: fonctions
order: 4
level: intermédiaire
summary: Une fonction récursive s'appelle elle-même. Elle a besoin d'un cas de base qui arrête la récursion. Idéale pour les arbres, les structures imbriquées et le « diviser pour régner ».
aliases: récursivité, récursion, recursion, récursif, récursive, fonction récursive, factorielle, fibonacci, puissance, cas de base, pile, stack overflow, goroutine stack exceeds, mémoïsation, backtracking, diviser pour régner, tours de hanoï, arbre
related: fonctions, closures, slices, structs
questions:
  - Qu'est-ce que la récursivité ?
  - Comment écrire une factorielle récursive ? -> factorielle
  - Pourquoi « goroutine stack exceeds 1000000000-byte limit » ? -> pile
  - Comment accélérer un Fibonacci récursif ? -> memoisation
  - Récursif ou itératif, que choisir ? -> recursif-ou-iteratif
---

@@ rapide

Une fonction **récursive** s'appelle elle-même sur un problème plus petit, jusqu'à atteindre un **cas de base** qui donne la réponse directement.

```go
func Factorielle(n int) int {
	if n <= 1 {          // cas de base : on arrête
		return 1
	}
	return n * Factorielle(n-1) // appel récursif sur un problème plus petit
}

fmt.Println(Factorielle(5)) // 120 = 5 × 4 × 3 × 2 × 1
```

Sans cas de base (ou s'il n'est jamais atteint), la récursion est infinie et le programme s'arrête avec `goroutine stack exceeds 1000000000-byte limit`. Go n'optimise pas les appels terminaux : pour des profondeurs énormes, préférez une boucle.

@@ detail

## Le principe {#principe}

Toute fonction récursive a deux parties :

1. **Le cas de base** : une situation simple où l'on connaît la réponse sans appel récursif.
2. **Le cas récursif** : on ramène le problème à une version **plus petite** de lui-même.

```go
// Somme des éléments d'une slice
func Somme(s []int) int {
	if len(s) == 0 {
		return 0 // cas de base
	}
	return s[0] + Somme(s[1:]) // premier élément + somme du reste
}
```

## Factorielle {#factorielle}

```go
func Factorielle(n int) int {
	if n < 0 {
		return 0 // convention pour les entrées invalides
	}
	if n <= 1 {
		return 1
	}
	return n * Factorielle(n-1)
}
```

Déroulé de `Factorielle(4)` :

```text
Factorielle(4)
= 4 * Factorielle(3)
= 4 * (3 * Factorielle(2))
= 4 * (3 * (2 * Factorielle(1)))
= 4 * (3 * (2 * 1))
= 24
```

:::warning Dépassement
`Factorielle(21)` dépasse la capacité d'un `int64` et donne un résultat faux, sans erreur. Pour de grands nombres, utilisez `math/big`, ou vérifiez le dépassement avant de multiplier.
:::

## Puissance {#puissance}

```go
// Version simple : n appels
func Puissance(base, exp int) int {
	if exp < 0 {
		return 0
	}
	if exp == 0 {
		return 1
	}
	return base * Puissance(base, exp-1)
}

// Exponentiation rapide : log(n) appels
func PuissanceRapide(base, exp int) int {
	if exp == 0 {
		return 1
	}
	moitie := PuissanceRapide(base, exp/2)
	if exp%2 == 0 {
		return moitie * moitie
	}
	return moitie * moitie * base
}
```

## Fibonacci et mémoïsation {#memoisation}

La version naïve est élégante mais **catastrophique** : elle recalcule sans cesse les mêmes valeurs (complexité exponentielle).

```go
func Fib(n int) int {
	if n < 2 {
		return n
	}
	return Fib(n-1) + Fib(n-2) // Fib(40) prend déjà plusieurs centaines de millisecondes
}
```

La **mémoïsation** stocke les résultats déjà calculés :

```go
func FibMemo(n int, memo map[int]int) int {
	if n < 2 {
		return n
	}
	if v, ok := memo[n]; ok {
		return v
	}
	memo[n] = FibMemo(n-1, memo) + FibMemo(n-2, memo)
	return memo[n]
}

fmt.Println(FibMemo(90, map[int]int{})) // instantané
```

Et la version itérative, la plus efficace :

```go
func FibIter(n int) int {
	a, b := 0, 1
	for range n {
		a, b = b, a+b
	}
	return a
}
```

## Inverser une chaîne récursivement {#inverser}

```go
func Inverser(s string) string {
	r := []rune(s) // pour gérer les caractères accentués
	if len(r) <= 1 {
		return s
	}
	return Inverser(string(r[1:])) + string(r[0])
}

fmt.Println(Inverser("élan")) // nalé
```

Pédagogique, mais inefficace (beaucoup de chaînes intermédiaires). Voir [[faq-inverser-string]] pour la bonne méthode.

## Parcourir un arbre {#arbre}

La récursivité est naturelle pour les structures elles-mêmes récursives :

```go
type Noeud struct {
	Valeur        int
	Gauche, Droit *Noeud
}

// Inserer ajoute v dans un arbre binaire de recherche.
func (n *Noeud) Inserer(v int) *Noeud {
	if n == nil {
		return &Noeud{Valeur: v}
	}
	if v < n.Valeur {
		n.Gauche = n.Gauche.Inserer(v)
	} else {
		n.Droit = n.Droit.Inserer(v)
	}
	return n
}

// ParcoursInfixe affiche les valeurs dans l'ordre croissant.
func (n *Noeud) ParcoursInfixe() {
	if n == nil {
		return
	}
	n.Gauche.ParcoursInfixe()
	fmt.Print(n.Valeur, " ")
	n.Droit.ParcoursInfixe()
}

var racine *Noeud
for _, v := range []int{5, 3, 8, 1, 4} {
	racine = racine.Inserer(v)
}
racine.ParcoursInfixe() // 1 3 4 5 8
```

Même principe pour parcourir des dossiers, analyser du JSON imbriqué ou évaluer une expression mathématique.

## Backtracking : les permutations {#backtracking}

```go
func Permutations(s []int) [][]int {
	if len(s) <= 1 {
		return [][]int{slices.Clone(s)}
	}
	var res [][]int
	for i := range s {
		reste := slices.Concat(s[:i], s[i+1:]) // tous sauf s[i]
		for _, p := range Permutations(reste) {
			res = append(res, append([]int{s[i]}, p...))
		}
	}
	return res
}

fmt.Println(Permutations([]int{1, 2, 3}))
// [[1 2 3] [1 3 2] [2 1 3] [2 3 1] [3 1 2] [3 2 1]]
```

## La pile d'appels {#pile}

Chaque appel de fonction réserve un espace sur la **pile** (stack) de la goroutine. Les piles Go sont **dynamiques** : elles démarrent petites (quelques Ko) et grandissent à la demande, jusqu'à une limite d'environ **1 Go** sur les systèmes 64 bits. Au-delà :

```text
runtime: goroutine stack exceeds 1000000000-byte limit
fatal error: stack overflow
```

Causes : cas de base oublié, cas de base jamais atteint (par exemple `n-1` sur un `n` négatif), ou profondeur vraiment trop grande. Go **n'optimise pas la récursion terminale** (*tail call*) : une récursion de plusieurs millions de niveaux doit être réécrite avec une boucle.

## Récursif ou itératif ? {#recursif-ou-iteratif}

| Récursif | Itératif |
|---|---|
| Naturel pour les arbres, graphes, structures imbriquées | Naturel pour les séquences simples |
| Code souvent plus court et lisible | Pas de risque de dépassement de pile |
| Coût d'un appel de fonction à chaque niveau | Généralement plus rapide |

Règle pratique : utilisez la récursivité quand la **structure des données** est récursive, et une boucle sinon.
