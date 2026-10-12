---
title: Comment afficher l'alphabet ou un caractère ?
category: faq
order: 16
level: débutant
summary: Une rune est un nombre, on peut donc boucler de 'a' à 'z' et afficher chaque caractère avec %c ou string(r). Pour afficher un caractère seul, fmt.Printf("%c", r) ou os.Stdout.Write.
aliases: afficher l'alphabet, printalphabet, print alphabet, printreversealphabet, alphabet à l'envers, printdigits, afficher les chiffres, printrune, print rune, afficher un caractère, printcomb, combinaisons, isnegative, piscine go, exercice go, z01, quest
related: runes, for, fmt, string
questions:
  - Comment afficher l'alphabet en Go ?
  - Comment afficher l'alphabet à l'envers ? -> variantes
  - Comment afficher un seul caractère (rune) ? -> afficher-rune
  - Comment afficher les chiffres de 0 à 9 ? -> variantes
  - Comment afficher toutes les combinaisons de 3 chiffres (printcomb) ? -> combinaisons
---

@@ rapide

```go
package main

import "fmt"

func main() {
	for r := 'a'; r <= 'z'; r++ {
		fmt.Printf("%c", r)
	}
	fmt.Println()
}
```

```output
abcdefghijklmnopqrstuvwxyz
```

`'a'` est une **rune**, c'est-à-dire un **nombre** (97). La boucle passe de 97 à 122, et `%c` affiche le caractère correspondant. Sans `%c`, `fmt.Print(r)` afficherait `979899…`.

@@ detail

## Afficher une rune {#afficher-rune}

Plusieurs façons d'afficher un caractère :

```go
r := 'G'
fmt.Printf("%c\n", r)  // G
fmt.Println(string(r)) // G
fmt.Print(r)           // 71 ⚠️ un nombre !
os.Stdout.WriteString(string(r))
```

Dans certains exercices (notamment les « piscines » Go), seule une fonction qui affiche **une rune** est autorisée. Si elle n'est pas fournie, voici son équivalent :

```go
// PrintRune affiche une seule rune sur la sortie standard.
func PrintRune(r rune) {
	os.Stdout.WriteString(string(r))
}
```

## Les variantes classiques {#variantes}

```go
// Alphabet à l'envers
for r := 'z'; r >= 'a'; r-- {
	PrintRune(r)
}
PrintRune('\n') // zyxwvutsrqponmlkjihgfedcba

// Les chiffres
for r := '0'; r <= '9'; r++ {
	PrintRune(r)
}
PrintRune('\n') // 0123456789

// En majuscules
for r := 'A'; r <= 'Z'; r++ {
	PrintRune(r)
}

// Une lettre sur deux
for r := 'a'; r <= 'z'; r += 2 {
	PrintRune(r)
}
// acegikmoqsuwy

// Alternance majuscule / minuscule
for i := range 26 {
	r := 'a' + rune(i)
	if i%2 == 1 {
		r = r - 'a' + 'A'
	}
	PrintRune(r)
}
// aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

## Afficher un nombre sans fmt {#nombre}

Avec seulement `PrintRune`, on affiche un entier chiffre par chiffre. Astuce : `'0' + chiffre` donne la rune du chiffre.

```go
func PrintNbr(n int) {
	if n < 0 {
		PrintRune('-')
		if n <= -10 {
			PrintNbr(-(n / 10)) // évite le dépassement pour le plus petit int
		}
		PrintRune(rune('0' - n%10))
		return
	}
	if n >= 10 {
		PrintNbr(n / 10) // d'abord les chiffres de gauche (récursivité)
	}
	PrintRune(rune('0' + n%10))
}

PrintNbr(-123) // -123
```

Le cas négatif est traité à part car `-n` déborde pour le plus petit `int` (`math.MinInt`).

## Positif ou négatif {#isnegative}

```go
func IsNegative(n int) {
	if n < 0 {
		PrintRune('T')
	} else {
		PrintRune('F')
	}
	PrintRune('\n')
}
```

## Les combinaisons {#combinaisons}

Afficher toutes les combinaisons de trois chiffres **différents**, dans l'ordre croissant (`012, 013, …, 789`) :

```go
func PrintComb() {
	for a := '0'; a <= '7'; a++ {
		for b := a + 1; b <= '8'; b++ {
			for c := b + 1; c <= '9'; c++ {
				PrintRune(a)
				PrintRune(b)
				PrintRune(c)
				if a != '7' { // pas de séparateur après la dernière (789)
					PrintRune(',')
					PrintRune(' ')
				}
			}
		}
	}
	PrintRune('\n')
}
```

```output
012, 013, 014, 015, 016, 017, 018, 019, 023, … , 689, 789
```

En commençant `b` à `a + 1` et `c` à `b + 1`, on garantit des chiffres **distincts et croissants**, sans doublon (`012` mais jamais `021`).

## Le code ASCII d'un caractère {#ascii}

```go
fmt.Println('A')       // 65
fmt.Println(int('a'))  // 97
fmt.Printf("%c\n", 65) // A
fmt.Println('a' - 'A') // 32 : l'écart entre minuscules et majuscules ASCII
```

Voir [[runes]] pour comprendre en détail les runes et l'UTF-8.
