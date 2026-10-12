---
title: Pourquoi l'ordre d'une map change-t-il ? Comment la parcourir triée ?
category: faq
order: 12
level: débutant
summary: L'ordre de parcours d'une map est volontairement aléatoire. Pour un ordre stable, récupérez les clés, triez-les (slices.Sorted(maps.Keys(m))), puis parcourez-les.
aliases: ordre map, map ordre aléatoire, map triée, trier une map, parcourir une map dans l'ordre, map ordonnée, ordered map, clés triées, trier par valeur, sorted map, range map ordre
related: maps, tri, for
questions:
  - Pourquoi ma map s'affiche dans un ordre différent à chaque fois ?
  - Comment parcourir une map triée par clé ? -> par-cle
  - Comment trier une map par valeur ? -> par-valeur
  - Comment garder l'ordre d'insertion ? -> ordre-insertion
---

@@ rapide

```go
m := map[string]int{"banane": 3, "pomme": 5, "kiwi": 1}

// Go 1.23+ : clés triées en une ligne
for _, k := range slices.Sorted(maps.Keys(m)) {
	fmt.Println(k, m[k])
}
// banane 3
// kiwi 1
// pomme 5
```

L'ordre aléatoire est **voulu** : la map est une table de hachage sans ordre, et Go le rend imprévisible pour qu'aucun programme ne dépende par accident d'un ordre qui pourrait changer.

`fmt.Println(m)` affiche toutefois les clés **triées**, pour faciliter le débogage et les tests.

@@ detail

## Pourquoi c'est aléatoire {#pourquoi}

Une map est implémentée par une **table de hachage** : les éléments sont rangés selon le hash de leur clé, pas selon leur ordre d'insertion ni leur valeur. Cet ordre interne change quand la map grandit.

Pour éviter que des programmes s'appuient sur un ordre « qui marche par hasard », le runtime **choisit un point de départ aléatoire** à chaque `range`. Deux parcours successifs de la même map peuvent donner des ordres différents.

## Parcourir par clé {#par-cle}

```go
// Go 1.23+
for _, k := range slices.Sorted(maps.Keys(m)) {
	fmt.Println(k, m[k])
}

// Version compatible avec les anciennes versions
cles := make([]string, 0, len(m))
for k := range m {
	cles = append(cles, k)
}
sort.Strings(cles) // ou slices.Sort(cles)
for _, k := range cles {
	fmt.Println(k, m[k])
}
```

## Trier par valeur {#par-valeur}

```go
scores := map[string]int{"Ada": 92, "Linus": 78, "Grace": 95}

noms := slices.Collect(maps.Keys(scores))
slices.SortFunc(noms, func(a, b string) int {
	return cmp.Or(
		cmp.Compare(scores[b], scores[a]), // score décroissant
		strings.Compare(a, b),             // puis nom, pour départager les égalités
	)
})

for i, nom := range noms {
	fmt.Printf("%d. %s (%d)\n", i+1, nom, scores[nom])
}
// 1. Grace (95)
// 2. Ada (92)
// 3. Linus (78)
```

Alternative : convertir en slice de paires.

```go
type Paire struct {
	Cle    string
	Valeur int
}

paires := make([]Paire, 0, len(scores))
for k, v := range scores {
	paires = append(paires, Paire{k, v})
}
slices.SortFunc(paires, func(a, b Paire) int { return cmp.Compare(b.Valeur, a.Valeur) })
```

## Garder l'ordre d'insertion {#ordre-insertion}

Go n'a pas de map ordonnée. On combine une map (accès rapide) et une slice (ordre) :

```go
type MapOrdonnee struct {
	cles    []string
	valeurs map[string]int
}

func NewMapOrdonnee() *MapOrdonnee {
	return &MapOrdonnee{valeurs: map[string]int{}}
}

func (m *MapOrdonnee) Set(k string, v int) {
	if _, existe := m.valeurs[k]; !existe {
		m.cles = append(m.cles, k)
	}
	m.valeurs[k] = v
}

func (m *MapOrdonnee) Parcourir(f func(k string, v int)) {
	for _, k := range m.cles {
		f(k, m.valeurs[k])
	}
}
```

Si les données sont peu nombreuses et naturellement ordonnées, une simple **slice de structs** est souvent plus adaptée qu'une map.

## Dans le JSON {#json}

`json.Marshal` écrit toujours les clés d'une map **triées**. Le JSON produit est donc stable, même si la map ne l'est pas.

Voir [[maps]] et [[tri#maps]].
