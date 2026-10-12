---
title: "Boucles : for et range"
category: controle
order: 2
level: débutant
summary: for est la seule boucle de Go. Elle a trois formes (classique, condition seule, infinie) et se combine avec range pour parcourir slices, strings, maps, channels, entiers et itérateurs.
aliases: for, boucle, boucles, loop, range, while, tant que, do while, itérer, itération, parcourir, répéter, break, continue, label, étiquette, boucle infinie, foreach, for each, compteur, itérateur, iter, iter.Seq
related: if, switch, slices, maps, closures, faq-boucle-goroutine
questions:
  - Comment faire une boucle en Go ?
  - Comment faire une boucle while en Go ? -> while
  - Comment parcourir une slice ou une map ? -> range
  - Comment répéter N fois ? -> range-entier
  - Comment sortir de deux boucles imbriquées ? -> labels
  - Pourquoi modifier v dans un range ne change pas ma slice ? -> copie-range
  - Comment écrire un itérateur personnalisé ? -> iterateurs
---

@@ rapide

`for` est la **seule** boucle de Go, mais elle sait tout faire :

```go
for i := 0; i < 5; i++ {
} // classique
for n < 100 {
} // équivalent d'un while
for {
} // infinie (sortie avec break ou return)

for i := range 5 {
} // 0, 1, 2, 3, 4 (Go 1.22+)
for i, v := range []string{"a", "b"} {
} // index et valeur
for cle, val := range m {
} // map (ordre aléatoire !)
for i, r := range "héllo" {
} // runes d'une string
for v := range ch {
} // jusqu'à la fermeture du channel
```

- `break` sort de la boucle, `continue` passe à l'itération suivante.
- Utilisez `_` pour ignorer l'index : `for _, v := range liste`.
- Dans `range`, `v` est une **copie** de l'élément.

@@ detail

## La forme classique {#classique}

```go
for i := 0; i < 10; i++ {
	fmt.Println(i)
}
```

Trois parties séparées par `;` : **initialisation** (exécutée une fois), **condition** (testée avant chaque tour), **post-instruction** (après chaque tour). Pas de parenthèses, accolades obligatoires. La variable `i` n'existe que dans la boucle.

On peut avoir plusieurs variables grâce à l'affectation multiple :

```go
for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
	s[i], s[j] = s[j], s[i] // inverse la slice
}
```

## L'équivalent du while {#while}

En omettant l'initialisation et la post-instruction, il ne reste que la condition :

```go
n := 1
for n < 1000 {
	n *= 2
}
fmt.Println(n) // 1024
```

Il n'y a pas de `do … while`. On l'imite avec une boucle infinie :

```go
for {
	saisie := lire()
	if saisie == "q" {
		break
	}
}
```

## La boucle infinie {#infinie}

```go
for {
	conn, err := ln.Accept()
	if err != nil {
		continue
	}
	go gerer(conn)
}
```

On sort d'une boucle infinie avec `break`, `return`, `os.Exit` ou un `panic`.

## range : parcourir une collection {#range}

| Ce qu'on parcourt | 1re valeur | 2e valeur |
|---|---|---|
| slice ou array `[]T` | index `int` | élément `T` (copie) |
| string | index de l'**octet** de début | **rune** |
| map `map[K]V` | clé `K` | valeur `V` |
| channel `chan T` | élément `T` | — |
| entier `n` (Go 1.22+) | `0` à `n-1` | — |
| fonction itérateur (Go 1.23+) | selon l'itérateur | selon l'itérateur |

```go
fruits := []string{"pomme", "poire", "kiwi"}

for i, f := range fruits {
	fmt.Println(i, f)
}
for i := range fruits { // index seul
	fmt.Println(i)
}
for _, f := range fruits { // valeur seule
	fmt.Println(f)
}
for range fruits { // ni l'un ni l'autre : juste répéter len(fruits) fois
	fmt.Println("tour")
}
```

### Les maps

```go
ages := map[string]int{"Ada": 36, "Linus": 54}
for nom, age := range ages {
	fmt.Println(nom, age)
}
```

:::warning Ordre aléatoire
L'ordre de parcours d'une map est **volontairement aléatoire** et change d'une exécution à l'autre. Pour un ordre stable, triez les clés : voir [[faq-ordre-map]].
:::

### Les strings

```go
for i, r := range "Ça va" {
	fmt.Printf("%d:%c ", i, r)
}
// 0:Ç 2:a 3:  4:v 5:a
```

`range` décode l'UTF-8 et renvoie des **runes** ; l'index saute de 2 après `Ç` qui occupe deux octets. Voir [[runes]].

## Répéter N fois {#range-entier}

Depuis Go 1.22, on peut faire `range` sur un entier :

```go
for i := range 3 {
	fmt.Println(i) // 0, 1, 2
}
for range 3 {
	fmt.Println("Go!")
}
```

## break, continue et labels {#labels}

```go
for i := range 10 {
	if i%2 == 0 {
		continue // saute les pairs
	}
	if i > 7 {
		break // arrête tout
	}
	fmt.Println(i) // 1 3 5 7
}
```

`break` et `continue` n'agissent que sur la boucle **la plus proche**. Pour sortir de **boucles imbriquées**, on place une **étiquette** (label) devant la boucle extérieure :

```go
grille := [][]int{{1, 2}, {3, 4}, {5, 6}}

recherche:
for i, ligne := range grille {
	for j, v := range ligne {
		if v == 4 {
			fmt.Println("trouvé en", i, j)
			break recherche // sort des DEUX boucles
		}
	}
}
```

:::warning break dans un switch ou un select
Dans une boucle, un `break` placé à l'intérieur d'un `switch` ou d'un `select` ne sort que du `switch`/`select`, **pas de la boucle**. Il faut un label (ou un `return`).
:::

## La variable de range est une copie {#copie-range}

```go
type Joueur struct{ Score int }
joueurs := []Joueur{{10}, {20}}

for _, j := range joueurs {
	j.Score += 5 // ⚠️ modifie une COPIE
}
fmt.Println(joueurs) // [{10} {20}] : rien n'a changé

for i := range joueurs {
	joueurs[i].Score += 5 // ✅ on passe par l'index
}
fmt.Println(joueurs) // [{15} {25}]
```

## Une variable neuve à chaque itération (Go 1.22) {#variable-par-iteration}

Depuis **Go 1.22**, chaque itération crée une **nouvelle** variable `i` (ou `v`). Les closures et goroutines qui capturent la variable de boucle voient donc la bonne valeur :

```go
for i := range 3 {
	go func() { fmt.Println(i) }() // affiche 0, 1, 2 (dans un ordre quelconque)
}
```

Avant Go 1.22, la variable était partagée entre les itérations et ce code affichait souvent `3 3 3`. Voir [[faq-boucle-goroutine]].

## Modifier une collection pendant un range {#modifier-pendant}

- **slice** : `range` évalue la slice **une seule fois** au départ. Ajouter des éléments avec `append` ne prolonge pas la boucle.
- **map** : supprimer des clés pendant le parcours est **autorisé**. Une clé ajoutée pendant le parcours peut être visitée ou non.

```go
for k, v := range stock {
	if v == 0 {
		delete(stock, k) // sans danger
	}
}
```

## Les itérateurs (Go 1.23+) {#iterateurs}

`range` accepte aussi des **fonctions itérateurs** : des fonctions qui reçoivent un `yield` et l'appellent pour chaque valeur. Le package `iter` définit les types `iter.Seq[V]` et `iter.Seq2[K, V]`.

```go
// Pairs renvoie un itérateur sur les nombres pairs inférieurs à n.
func Pairs(n int) iter.Seq[int] {
	return func(yield func(int) bool) {
		for i := 0; i < n; i += 2 {
			if !yield(i) { // false : la boucle appelante a fait break
				return
			}
		}
	}
}

for p := range Pairs(10) {
	fmt.Print(p, " ") // 0 2 4 6 8
}
```

La bibliothèque standard en fournit beaucoup : `maps.Keys(m)`, `slices.Values(s)`, `slices.Backward(s)`, `strings.SplitSeq(s, ",")`, `strings.Lines(s)`…

```go
for i, v := range slices.Backward([]string{"a", "b", "c"}) {
	fmt.Println(i, v) // 2 c, 1 b, 0 a
}
```
