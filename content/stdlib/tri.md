---
title: Trier et rechercher (sort, slices)
category: stdlib
order: 7
level: intermédiaire
summary: slices.Sort trie une slice de nombres ou de chaînes. slices.SortFunc trie avec une fonction de comparaison (cmp.Compare), et cmp.Or permet de trier sur plusieurs critères. slices.BinarySearch cherche dans une slice triée.
aliases: tri, trier, sort, sorting, ordonner, classer, ordre croissant, ordre décroissant, inverser l'ordre, slices.sort, slices.sortfunc, sort.slice, sort.ints, sort.strings, cmp.compare, cmp.or, trier une struct, trier par plusieurs critères, recherche dichotomique, binary search, binarysearch, tri stable, trier une map
related: slices, maps, generiques, faq-ordre-map, closures
questions:
  - Comment trier une slice en Go ?
  - Comment trier dans l'ordre décroissant ? -> decroissant
  - Comment trier une slice de structs par un champ ? -> structs
  - Comment trier selon plusieurs critères ? -> plusieurs-criteres
  - Comment trier une map par clé ou par valeur ? -> maps
  - Comment chercher rapidement dans une slice triée ? -> recherche
---

@@ rapide

```go
nombres := []int{5, 2, 8, 1}
slices.Sort(nombres) // [1 2 5 8]

mots := []string{"poire", "abricot", "kiwi"}
slices.Sort(mots) // [abricot kiwi poire]

type Personne struct {
	Nom string
	Age int
}
gens := []Personne{{"Ada", 36}, {"Linus", 54}, {"Grace", 36}}

slices.SortFunc(gens, func(a, b Personne) int {
	return cmp.Or(
		cmp.Compare(a.Age, b.Age),     // 1er critère : âge croissant
		strings.Compare(a.Nom, b.Nom), // 2e critère : nom
	)
})
// [{Ada 36} {Grace 36} {Linus 54}]
```

- `slices.Sort` trie **sur place** tout type ordonné (nombres, chaînes).
- `slices.SortFunc` attend une fonction qui renvoie **négatif** (a avant b), **0** (égaux) ou **positif** (a après b).
- Pour l'ordre **décroissant**, inversez : `cmp.Compare(b.Age, a.Age)`.

@@ detail

## Trier des types simples {#simples}

```go
ints := []int{42, 7, 19}
slices.Sort(ints) // [7 19 42]

floats := []float64{3.14, 1.41, 2.71}
slices.Sort(floats) // [1.41 2.71 3.14]

noms := []string{"Émile", "bob", "Alice"}
slices.Sort(noms) // [Alice bob Émile] : ordre des octets (majuscules avant minuscules)

fmt.Println(slices.IsSorted(ints)) // true
```

Le tri des chaînes est **lexicographique sur les octets** : `"Z" < "a"` et les lettres accentuées passent après `z`. Pour un tri insensible à la casse :

```go
slices.SortFunc(noms, func(a, b string) int {
	return strings.Compare(strings.ToLower(a), strings.ToLower(b))
})
```

Pour un tri alphabétique respectant les règles du français (accents), utilisez `golang.org/x/text/collate`.

## La fonction de comparaison {#comparaison}

`slices.SortFunc(s, cmp)` attend une fonction `func(a, b T) int` qui renvoie :

| Résultat | Signification |
|---|---|
| négatif | `a` doit être placé **avant** `b` |
| `0` | ordre indifférent |
| positif | `a` doit être placé **après** `b` |

Le package `cmp` fournit `cmp.Compare(a, b)` qui renvoie exactement -1, 0 ou +1 pour les types ordonnés.

## Ordre décroissant {#decroissant}

```go
slices.SortFunc(nombres, func(a, b int) int {
	return cmp.Compare(b, a) // b et a inversés
})

// ou : trier puis inverser
slices.Sort(nombres)
slices.Reverse(nombres)
```

## Trier des structs {#structs}

```go
type Produit struct {
	Nom  string
	Prix float64
}

produits := []Produit{{"Clavier", 49.9}, {"Souris", 19.5}, {"Écran", 189}}

// Par prix croissant
slices.SortFunc(produits, func(a, b Produit) int {
	return cmp.Compare(a.Prix, b.Prix)
})

// Par nom
slices.SortFunc(produits, func(a, b Produit) int {
	return strings.Compare(a.Nom, b.Nom)
})
```

## Plusieurs critères {#plusieurs-criteres}

`cmp.Or` (Go 1.22+) renvoie son premier argument **non nul** : parfait pour enchaîner les critères.

```go
type Eleve struct {
	Nom    string
	Classe string
	Note   float64
}

slices.SortFunc(eleves, func(a, b Eleve) int {
	return cmp.Or(
		strings.Compare(a.Classe, b.Classe), // 1. par classe
		cmp.Compare(b.Note, a.Note),         // 2. par note décroissante
		strings.Compare(a.Nom, b.Nom),       // 3. par nom
	)
})
```

## Tri stable {#stable}

Un tri **stable** conserve l'ordre d'origine des éléments égaux. `slices.Sort` et `slices.SortFunc` ne le garantissent pas ; utilisez `slices.SortStableFunc` :

```go
// Les produits de même prix gardent leur ordre initial
slices.SortStableFunc(produits, func(a, b Produit) int {
	return cmp.Compare(a.Prix, b.Prix)
})
```

## Trier une map {#maps}

Une map n'a pas d'ordre. On trie ses **clés**, puis on les parcourt :

```go
stock := map[string]int{"pommes": 5, "kiwis": 12, "bananes": 3}

// Par clé (Go 1.23+)
for _, fruit := range slices.Sorted(maps.Keys(stock)) {
	fmt.Println(fruit, stock[fruit])
}

// Par valeur décroissante
fruits := slices.Collect(maps.Keys(stock))
slices.SortFunc(fruits, func(a, b string) int {
	return cmp.Compare(stock[b], stock[a])
})
fmt.Println(fruits) // [kiwis pommes bananes]
```

Voir [[faq-ordre-map]].

## Rechercher dans une slice triée {#recherche}

La **recherche dichotomique** trouve un élément en `log₂(n)` comparaisons au lieu de `n` (20 comparaisons pour un million d'éléments) :

```go
s := []int{2, 5, 8, 13, 21}
i, trouve := slices.BinarySearch(s, 13)
fmt.Println(i, trouve) // 3 true

i, trouve = slices.BinarySearch(s, 10)
fmt.Println(i, trouve) // 3 false : 10 serait inséré à l'indice 3

// Insérer en gardant la slice triée
s = slices.Insert(s, i, 10) // [2 5 8 10 13 21]

// Avec une fonction de comparaison
idx, ok := slices.BinarySearchFunc(produits, 49.9, func(p Produit, prix float64) int {
	return cmp.Compare(p.Prix, prix)
})
```

:::warning La slice doit être triée
Sur une slice non triée (ou triée selon un autre critère), `BinarySearch` renvoie des résultats faux, sans erreur. Pour une slice non triée, utilisez `slices.Index` ou `slices.Contains`.
:::

## Minimum et maximum {#min-max}

```go
slices.Min([]int{4, 2, 9}) // 2
slices.Max([]int{4, 2, 9}) // 9
min(4, 2, 9)               // 2 (fonction intégrée, Go 1.21+)

plusCher := slices.MaxFunc(produits, func(a, b Produit) int {
	return cmp.Compare(a.Prix, b.Prix)
})
```

`slices.Min` et `slices.Max` provoquent un panic sur une slice vide.

## L'ancien package sort {#package-sort}

Avant Go 1.21, on utilisait le package `sort`. Vous le croiserez dans du code existant :

```go
sort.Ints(nombres)
sort.Strings(mots)
sort.Slice(gens, func(i, j int) bool {
	return gens[i].Age < gens[j].Age // reçoit des INDICES et renvoie un bool
})
sort.SliceStable(gens, func(i, j int) bool { … })

// Ou implémenter sort.Interface (Len, Less, Swap)
type ParAge []Personne
func (a ParAge) Len() int           { return len(a) }
func (a ParAge) Less(i, j int) bool { return a[i].Age < a[j].Age }
func (a ParAge) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
sort.Sort(ParAge(gens))
```

Le package `slices` est plus simple, plus sûr (typé) et généralement plus rapide : préférez-le dans le nouveau code.
