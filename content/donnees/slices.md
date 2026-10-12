---
title: Slices
category: donnees
order: 2
level: débutant
summary: Une slice est une vue dynamique sur un tableau : un pointeur, une longueur (len) et une capacité (cap). On ajoute avec append, on découpe avec s[a:b], on copie avec copy. Attention, plusieurs slices peuvent partager la même mémoire.
aliases: slice, slices, liste, listes, tableau dynamique, list, array list, vecteur, vector, append, ajouter, len, cap, capacité, longueur, make, copy, copier, découper, sous-slice, nil slice, slice vide, 2d slice, matrice, package slices, contains, index, insert, delete
related: arrays, maps, tri, faq-array-vs-slice, faq-slice-partagee, faq-supprimer-element, faq-element-slice, generiques
questions:
  - Qu'est-ce qu'une slice en Go ?
  - Comment ajouter un élément à une slice ? -> append
  - Quelle est la différence entre len et cap ? -> len-cap
  - Comment copier une slice ? -> copy
  - Pourquoi ma slice est modifiée alors que je modifie une autre slice ? -> partage
  - Quelle différence entre une slice nil et une slice vide ? -> nil-vide
  - Comment créer une slice à deux dimensions ? -> slices-2d
  - Quelles fonctions offre le package slices ? -> package-slices
---

@@ rapide

```go
s := []int{1, 2, 3}         // littéral
s = append(s, 4, 5)         // ajoute (toujours réaffecter le résultat !)
fmt.Println(len(s), cap(s)) // 5 6 (la capacité peut varier)

t := s[1:3]             // [2 3] : indices 1 à 2 (3 exclu)
u := make([]int, 0, 10) // longueur 0, capacité 10

c := make([]int, len(s))
copy(c, s) // copie indépendante (ou : slices.Clone(s))

slices.Contains(s, 3) // true
slices.Sort(s)
```

Une slice est un **en-tête** de trois champs : un **pointeur** vers un tableau, une **longueur** (`len`) et une **capacité** (`cap`). Conséquence majeure : `t := s[1:3]` **partage** la mémoire de `s` : modifier `t[0]` modifie `s[1]`.

@@ detail

## Ce qu'est une slice {#structure}

Une slice ne contient pas les données : elle **pointe** vers un tableau (*array*) sous-jacent.

```text
s := []int{10, 20, 30, 40, 50}

en-tête de s           tableau sous-jacent
┌─────────┐           ┌────┬────┬────┬────┬────┐
│ ptr ────┼──────────▶│ 10 │ 20 │ 30 │ 40 │ 50 │
│ len = 5 │           └────┴────┴────┴────┴────┘
│ cap = 5 │
└─────────┘
```

- **len** : nombre d'éléments accessibles (`s[0]` à `s[len-1]`).
- **cap** : nombre d'éléments disponibles dans le tableau à partir du début de la slice.

Passer une slice à une fonction copie seulement l'**en-tête** (24 octets) : la fonction travaille sur les **mêmes données**.

## Créer une slice {#creer}

```go
var a []int                  // nil : len 0, cap 0
b := []string{"a", "b", "c"} // littéral
c := make([]int, 5)          // [0 0 0 0 0] : len 5, cap 5
d := make([]int, 0, 100)     // len 0, cap 100 : prête à recevoir 100 éléments
arr := [5]int{1, 2, 3, 4, 5}
e := arr[1:4] // depuis un array : [2 3 4]
```

## Ajouter : append {#append}

`append` ajoute des éléments **et renvoie la nouvelle slice**. Il faut **toujours** récupérer son résultat :

```go
var s []int
s = append(s, 1)
s = append(s, 2, 3, 4)
autres := []int{5, 6}
s = append(s, autres...) // « ... » déplie une slice en arguments
fmt.Println(s)           // [1 2 3 4 5 6]
```

Comment ça marche :

- S'il reste de la **capacité**, `append` écrit dans le tableau existant.
- Sinon, il **alloue un nouveau tableau** plus grand (environ deux fois plus grand pour les petites slices), copie les éléments, puis ajoute.

```go
var s []int
for i := range 10 {
	s = append(s, i)
	fmt.Println(len(s), cap(s))
}
// 1 1, 2 2, 3 4, 4 4, 5 8, 6 8, 7 8, 8 8, 9 16, 10 16
```

:::tip Préallouer
Si vous connaissez la taille finale, réservez la capacité : `s := make([]T, 0, n)`. Vous évitez ainsi les réallocations successives.
:::

## len et cap {#len-cap}

```go
s := make([]int, 3, 10)
fmt.Println(len(s), cap(s)) // 3 10
s[2] = 1                    // ok
s[5] = 1                    // ❌ panic : index out of range [5] with length 3
s = s[:6]                   // on peut « agrandir » la vue jusqu'à cap
s[5] = 1                    // ok maintenant
```

`len` définit ce qui est accessible ; `cap` définit jusqu'où on peut étendre sans réallouer.

## Découper : s[a:b] {#decouper}

```go
s := []int{0, 1, 2, 3, 4, 5}
s[2:4] // [2 3]       de l'indice 2 inclus à 4 exclu
s[:3]  // [0 1 2]     depuis le début
s[3:]  // [3 4 5]     jusqu'à la fin
s[:]   // [0 1 2 3 4 5] toute la slice
```

La sous-slice a pour longueur `b - a` et pour capacité `cap(s) - a`.

## Le partage de mémoire {#partage}

C'est **le** point à comprendre. Découper ne copie rien :

```go
original := []int{1, 2, 3, 4, 5}
partie := original[1:3] // [2 3]
partie[0] = 99
fmt.Println(original) // [1 99 3 4 5]  ⚠️ original modifié !
```

Encore plus subtil, `append` sur une sous-slice peut **écraser** des éléments de l'original s'il reste de la capacité :

```go
a := []int{1, 2, 3, 4, 5}
b := a[:2]         // [1 2], mais cap(b) = 5
b = append(b, 100) // écrit dans a[2] !
fmt.Println(a)     // [1 2 100 4 5]
```

Pour l'éviter, limitez la capacité avec l'**expression de slice complète** `s[bas:haut:max]` : `append` est alors forcé de réallouer.

```go
b := a[:2:2]       // len 2, cap 2
b = append(b, 100) // nouveau tableau : a reste intact
```

Voir [[faq-slice-partagee]] pour plus d'exemples.

## Copier : copy {#copy}

```go
src := []int{1, 2, 3}
dst := make([]int, len(src))
n := copy(dst, src) // copie min(len(dst), len(src)) éléments
fmt.Println(n, dst) // 3 [1 2 3]

clone := slices.Clone(src)           // Go 1.21+ : une ligne
clone2 := append([]int(nil), src...) // idiome classique
```

:::warning copy ne fait pas grandir la destination
`copy` copie au maximum `len(dst)` éléments. Avec `dst := []int{}` (longueur 0), rien n'est copié. Créez la destination avec `make([]T, len(src))`.
:::

## Slice nil ou slice vide {#nil-vide}

```go
var a []int                   // nil
b := []int{}                  // vide mais non nil
fmt.Println(a == nil, len(a)) // true 0
fmt.Println(b == nil, len(b)) // false 0
```

Les deux se comportent pareil avec `len`, `range` et `append`. Différences :

- `a == nil` est vrai, `b == nil` est faux.
- En JSON, une slice nil devient `null`, une slice vide devient `[]`.

**Testez donc la vacuité avec `len(s) == 0`**, jamais avec `s == nil`.

## Modifier dans une fonction {#fonctions}

```go
func doubler(s []int) {
	for i := range s {
		s[i] *= 2 // ✅ modifie les éléments de l'appelant (données partagées)
	}
}

func ajouter(s []int) {
	s = append(s, 99) // ⚠️ l'appelant ne voit pas le nouvel élément
}

func ajouterBien(s []int) []int {
	return append(s, 99) // ✅ on renvoie la nouvelle slice
}
```

La fonction reçoit une **copie de l'en-tête** : elle partage les éléments, mais pas la longueur. D'où l'idiome `s = f(s)`, comme pour `append`.

## Supprimer et insérer {#supprimer-inserer}

```go
s := []string{"a", "b", "c", "d"}

s = slices.Delete(s, 1, 2)        // supprime l'indice 1 : [a c d]
s = slices.Insert(s, 1, "x", "y") // insère à l'indice 1 : [a x y c d]

// Sans le package slices :
i := 1
s = append(s[:i], s[i+1:]...) // supprime l'indice i (en conservant l'ordre)
```

Voir [[faq-supprimer-element]] pour toutes les variantes (y compris supprimer pendant un parcours).

## Slices à deux dimensions {#slices-2d}

```go
lignes, colonnes := 3, 4
grille := make([][]int, lignes)
for i := range grille {
	grille[i] = make([]int, colonnes) // chaque ligne doit être allouée
}
grille[1][2] = 7

triangle := [][]int{
	{1},
	{1, 1},
	{1, 2, 1},
}
```

Chaque ligne est une slice indépendante : elles peuvent avoir des longueurs différentes.

## Le package slices {#package-slices}

Depuis Go 1.21, le package `slices` (générique) couvre la plupart des besoins :

| Fonction | Rôle |
|---|---|
| `slices.Contains(s, v)` | `v` est-il présent ? |
| `slices.Index(s, v)` | position de `v`, ou `-1` |
| `slices.IndexFunc(s, f)` | position du premier élément qui vérifie `f` |
| `slices.Sort(s)` / `slices.SortFunc(s, cmp)` | trier |
| `slices.BinarySearch(s, v)` | recherche dichotomique dans une slice triée |
| `slices.Reverse(s)` | inverser sur place |
| `slices.Max(s)` / `slices.Min(s)` | plus grand / plus petit |
| `slices.Equal(a, b)` | égalité élément par élément |
| `slices.Clone(s)` | copie |
| `slices.Compact(s)` | supprime les doublons **consécutifs** |
| `slices.Insert`, `slices.Delete`, `slices.Replace` | modifier |
| `slices.DeleteFunc(s, f)` | supprimer les éléments qui vérifient `f` |
| `slices.Concat(a, b, c)` | concaténer (Go 1.22+) |
| `slices.Repeat(s, n)` | répéter (Go 1.23+) |
| `slices.Chunk(s, n)` | découper en paquets de n (itérateur, Go 1.23+) |

```go
nombres := []int{5, 2, 8, 2, 9}
slices.Sort(nombres)                         // [2 2 5 8 9]
nombres = slices.Compact(nombres)            // [2 5 8 9]
i, trouve := slices.BinarySearch(nombres, 8) // 2 true
pairs := slices.DeleteFunc(slices.Clone(nombres), func(n int) bool { return n%2 != 0 })
fmt.Println(pairs) // [2 8]
```

Voir aussi [[tri]].

## Pièges récapitulatifs {#pieges}

- Oublier de réaffecter : `append(s, x)` seul ne fait rien d'utile (le compilateur le refuse d'ailleurs).
- Modifier une sous-slice modifie l'original.
- `append` sur une sous-slice peut écraser l'original : utilisez `s[a:b:b]`.
- `v` dans `for _, v := range s` est une copie : modifiez `s[i]`.
- Garder une petite sous-slice d'une énorme slice garde **toute** l'énorme slice en mémoire : copiez la partie utile avec `slices.Clone`.
