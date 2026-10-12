---
title: Comment inverser une chaîne de caractères ?
category: faq
order: 1
level: débutant
summary: Convertir la chaîne en []rune, échanger les éléments des deux bouts vers le milieu, puis reconvertir en string. Passer par les runes évite de casser les caractères accentués.
aliases: inverser une string, inverser une chaîne, reverse string, renverser, retourner une chaîne, chaîne à l'envers, palindrome, reverse
related: string, runes, slices, recursivite
questions:
  - Comment inverser une string en Go ?
  - Pourquoi mon inversion de chaîne casse les accents ? -> pourquoi-runes
  - Comment vérifier si un mot est un palindrome ? -> palindrome
---

@@ rapide

```go
func Inverser(s string) string {
	r := []rune(s)
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		r[i], r[j] = r[j], r[i]
	}
	return string(r)
}

fmt.Println(Inverser("Bonjour")) // ruojnoB
fmt.Println(Inverser("été 🚀"))  // 🚀 été
```

On travaille sur des **runes** (caractères) et non sur des **octets** : sinon les caractères qui occupent plusieurs octets (é, €, emojis) seraient détruits.

Variante en une ligne avec le package `slices` :

```go
r := []rune(s)
slices.Reverse(r)
inverse := string(r)
```

@@ detail

## Pourquoi passer par les runes ? {#pourquoi-runes}

Une string est une suite d'**octets**. En UTF-8, `é` occupe **2 octets** (`c3 a9`). Inverser les octets donne `a9 c3`, qui n'est pas un caractère valide :

```go
func InverserOctets(s string) string { // ❌ version naïve
	b := []byte(s)
	for i, j := 0, len(b)-1; i < j; i, j = i+1, j-1 {
		b[i], b[j] = b[j], b[i]
	}
	return string(b)
}

fmt.Println(InverserOctets("abc")) // cba     : correct (ASCII)
fmt.Println(InverserOctets("été")) // ��t��   : cassé !
```

Avec `[]rune(s)`, chaque élément est un caractère complet. Voir [[runes]].

## Comment fonctionne l'échange {#algorithme}

Deux indices partent des extrémités et se rejoignent au milieu ; à chaque étape on échange les deux éléments :

```text
[B o n j o u r]   i=0, j=6 → échange B et r
[r o n j o u B]   i=1, j=5 → échange o et u
[r u n j o o B]   i=2, j=4 → échange n et o
[r u o j n o B]   i=3, j=3 → stop (i n'est plus < j)
```

On parcourt seulement la moitié de la chaîne, et l'affectation multiple `a, b = b, a` fait l'échange sans variable temporaire.

## Autres approches {#autres}

En construisant une nouvelle chaîne (moins efficace mais intuitif) :

```go
func Inverser2(s string) string {
	var sb strings.Builder
	r := []rune(s)
	for i := len(r) - 1; i >= 0; i-- {
		sb.WriteRune(r[i])
	}
	return sb.String()
}
```

En récursif (pédagogique, voir [[recursivite#inverser]]) :

```go
func Inverser3(s string) string {
	r := []rune(s)
	if len(r) <= 1 {
		return s
	}
	return Inverser3(string(r[1:])) + string(r[0])
}
```

:::info Les caractères combinés
Certains caractères visibles sont composés de **plusieurs runes** (par exemple un `e` suivi d'un accent combinant `U+0301`, ou des emojis de famille). Les inverser rune par rune sépare l'accent de sa lettre. Pour ces cas rares, il faut travailler par *graphèmes* avec une bibliothèque dédiée.
:::

## Palindrome {#palindrome}

Un palindrome se lit pareil dans les deux sens. Pas besoin d'inverser toute la chaîne : on compare les deux bouts.

```go
func EstPalindrome(s string) bool {
	r := []rune(strings.ToLower(s))
	for i, j := 0, len(r)-1; i < j; i, j = i+1, j-1 {
		if r[i] != r[j] {
			return false
		}
	}
	return true
}

fmt.Println(EstPalindrome("Kayak")) // true
fmt.Println(EstPalindrome("Go"))    // false
```

Pour ignorer les espaces et la ponctuation (« Esope reste ici et se repose »), filtrez d'abord avec `unicode.IsLetter`.
