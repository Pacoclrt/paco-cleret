---
title: Comment savoir si une slice contient un élément ?
category: faq
order: 10
level: débutant
summary: slices.Contains(s, v) renvoie true si v est présent, slices.Index(s, v) donne sa position (ou -1). Pour des recherches répétées, construisez une map. Pour une slice triée, slices.BinarySearch est plus rapide.
aliases: contains, slice contient, in array, includes, élément dans une slice, chercher dans une slice, trouver un élément, index of, indexof, rechercher une valeur, existe dans la liste
related: slices, maps, tri
questions:
  - Comment vérifier qu'un élément est dans une slice ?
  - Comment trouver la position d'un élément ? -> position
  - Comment chercher une struct selon un champ ? -> condition
  - Comment rechercher rapidement beaucoup de fois ? -> map
---

@@ rapide

```go
fruits := []string{"pomme", "poire", "kiwi"}

slices.Contains(fruits, "kiwi") // true
slices.Index(fruits, "poire")   // 1
slices.Index(fruits, "mangue")  // -1 (absent)

// Selon une condition
i := slices.IndexFunc(fruits, func(f string) bool {
	return strings.HasPrefix(f, "po")
})
// 0 ("pomme")
```

Le package `slices` (Go 1.21+) fonctionne pour tous les types comparables. Pour de nombreuses recherches dans une grande collection, utilisez une **map** (recherche instantanée).

@@ detail

## Avec le package slices {#slices}

```go
nombres := []int{4, 8, 15, 16, 23, 42}

slices.Contains(nombres, 15)                    // true
slices.ContainsFunc(nombres, func(n int) bool { // un élément > 40 ?
	return n > 40
}) // true
```

## Trouver la position {#position}

```go
i := slices.Index(nombres, 16) // 3
if i == -1 {
	fmt.Println("absent")
}
```

`slices.Index` renvoie le **premier** indice trouvé.

## Chercher selon une condition {#condition}

Pour des structs, on cherche généralement sur un champ :

```go
type Utilisateur struct {
	ID  int
	Nom string
}

users := []Utilisateur{
	{1, "Ada"}, {2, "Linus"}, {3, "Grace"},
}

i := slices.IndexFunc(users, func(u Utilisateur) bool {
	return u.Nom == "Linus"
})
if i >= 0 {
	fmt.Println("trouvé :", users[i]) // {2 Linus}
}
```

`slices.Contains(users, Utilisateur{2, "Linus"})` fonctionne aussi (la struct est comparable), mais exige que **tous** les champs correspondent.

## Sans le package slices {#boucle}

Avant Go 1.21, ou pour bien comprendre ce qui se passe :

```go
func Contient(s []string, cible string) bool {
	for _, v := range s {
		if v == cible {
			return true
		}
	}
	return false
}
```

## Recherches répétées : une map {#map}

`slices.Contains` parcourt toute la slice : `O(n)`. Pour tester l'appartenance des milliers de fois, construisez une fois un **ensemble** :

```go
interdits := []string{"admin", "root", "system"}

ensemble := make(map[string]bool, len(interdits))
for _, v := range interdits {
	ensemble[v] = true
}

if ensemble["root"] { // O(1) : instantané quelle que soit la taille
	fmt.Println("nom réservé")
}
```

## Slice triée : la recherche dichotomique {#triee}

```go
tries := []int{2, 5, 8, 13, 21, 34}
i, trouve := slices.BinarySearch(tries, 13) // 3 true
```

`O(log n)` : 20 comparaisons pour un million d'éléments. Uniquement sur une slice **triée** (voir [[tri#recherche]]).

| Méthode | Complexité | Quand |
|---|---|---|
| `slices.Contains` / `Index` | `O(n)` | cas général, petites slices, recherche ponctuelle |
| map | `O(1)` après construction | nombreuses recherches |
| `slices.BinarySearch` | `O(log n)` | données déjà triées |

## Insensible à la casse {#casse}

```go
ok := slices.ContainsFunc(fruits, func(f string) bool {
	return strings.EqualFold(f, "KIWI")
})
```
