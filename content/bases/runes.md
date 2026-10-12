---
title: Runes, bytes et UTF-8
category: bases
order: 5
level: débutant
summary: Un byte est un octet (uint8). Une rune est un caractère Unicode (int32). En UTF-8, un caractère occupe de 1 à 4 octets, d'où l'importance de les distinguer.
aliases: rune, runes, byte, bytes, octet, octets, caractère, caractères, char, utf8, utf-8, unicode, encodage, point de code, code ascii, ascii, lettre, majuscule, minuscule, '%c', isletter, isdigit, toupper
related: string, conversions, faq-afficher-alphabet, faq-inverser-string, package-strings
questions:
  - Qu'est-ce qu'une rune en Go ?
  - Quelle différence entre byte et rune ? -> byte-vs-rune
  - Comment fonctionne l'UTF-8 ? -> utf8
  - Comment savoir si un caractère est une lettre ou un chiffre ? -> package-unicode
  - Comment passer un caractère en majuscule ? -> package-unicode
  - Comment obtenir le code ASCII d'un caractère ? -> arithmetique
  - Comment convertir un chiffre caractère '7' en entier 7 ? -> arithmetique
---

@@ rapide

```go
var b byte = 'A' // byte = uint8 : un OCTET (0 à 255)
var r rune = 'é' // rune = int32 : un CARACTÈRE Unicode

fmt.Println(b, r)           // 65 233 : ce sont des nombres !
fmt.Printf("%c %c\n", b, r) // A é    : %c les affiche comme caractères

s := "été"
fmt.Println(len(s))         // 5 octets
fmt.Println(len([]rune(s))) // 3 runes (caractères)
```

- Un **littéral entre apostrophes** `'a'` est une **rune**, entre guillemets `"a"` c'est une **string**.
- Une rune est un **nombre** : on peut faire `'a' + 1` (= `'b'`) ou `r - '0'` pour obtenir la valeur d'un chiffre.
- `range` sur une string donne des **runes** ; l'indexation `s[i]` donne des **bytes**.

@@ detail

## byte contre rune {#byte-vs-rune}

| | `byte` | `rune` |
|---|---|---|
| Alias de | `uint8` | `int32` |
| Représente | un **octet** | un **point de code Unicode** (un caractère) |
| Plage | 0 à 255 | 0 à 0x10FFFF |
| Obtenu par | `s[i]`, `[]byte(s)` | `range s`, `[]rune(s)`, `'x'` |
| Utilisé pour | données binaires, réseau, fichiers, ASCII | texte, caractères |

Un ordinateur ne stocke que des nombres. **Unicode** attribue un numéro (le *point de code*) à chaque caractère de toutes les écritures : `A` = 65, `é` = 233, `€` = 8364, `世` = 19990. Une **rune** est simplement ce numéro.

## L'encodage UTF-8 {#utf8}

Il faut ensuite stocker ces numéros en octets : c'est le rôle d'un **encodage**. Go utilise **UTF-8** (inventé d'ailleurs par Ken Thompson et Rob Pike, deux des créateurs de Go). Chaque caractère y occupe **1 à 4 octets** :

| Points de code | Octets | Exemples |
|---|---|---|
| 0 à 127 (ASCII) | 1 | `A`, `z`, `0`, `!` |
| 128 à 2047 | 2 | `é`, `ç`, `ñ`, `Ω` |
| 2048 à 65535 | 3 | `€`, `世`, `あ` |
| au-delà | 4 | emojis, symboles rares |

```go
for _, c := range []string{"A", "é", "€", "🚀"} {
	fmt.Printf("%s : %d octet(s) % x\n", c, len(c), c)
}
```

```output
A : 1 octet(s) 41
é : 2 octet(s) c3 a9
€ : 3 octet(s) e2 82 ac
🚀 : 4 octet(s) f0 9f 9a 80
```

Atout d'UTF-8 : tout texte ASCII est aussi de l'UTF-8 valide, octet pour octet.

## Littéraux de rune {#litteraux}

```go
a := 'a'              // rune 97
nl := '\n'            // rune 10
e := 'é'              // é
q := '\''             // apostrophe échappée
fmt.Printf("%T\n", a) // int32
```

Un littéral de rune contient **un seul** caractère : `'ab'` ne compile pas.

## Parcourir les caractères {#parcourir}

```go
s := "Noël"
for i, r := range s {
	fmt.Printf("octet %d : %c (U+%04X)\n", i, r, r)
}
```

```output
octet 0 : N (U+004E)
octet 1 : o (U+006F)
octet 2 : ë (U+00EB)
octet 4 : l (U+006C)
```

L'index saute de 2 à 4 car `ë` occupe deux octets. Si la chaîne contient un octet invalide, `range` renvoie la rune spéciale `utf8.RuneError` (`U+FFFD`, affichée `�`).

## Conversions {#conversions}

```go
s := "Go!"
b := []byte(s) // [71 111 33]   copie modifiable des octets
r := []rune(s) // [71 111 33]   copie modifiable des caractères

string(b)    // "Go!"
string(r)    // "Go!"
string('G')  // "G"
string(r[0]) // "G"
```

Toutes ces conversions **copient** les données (sauf optimisations du compilateur).

## Calculer avec les runes {#arithmetique}

Puisqu'une rune est un entier, on peut faire de l'arithmétique :

```go
fmt.Println('a' + 1)         // 98
fmt.Println(string('a' + 1)) // "b"

// Valeur numérique d'un chiffre
c := '7'
n := int(c - '0') // 7

// Code ASCII / Unicode d'un caractère
fmt.Println(int('A')) // 65

// Position d'une lettre dans l'alphabet
pos := 'e' - 'a' + 1 // 5

// Majuscule ASCII « à la main »
minuscule := 'g'
majuscule := minuscule - 'a' + 'A' // 'G'
```

Afficher l'alphabet devient très simple :

```go
for r := 'a'; r <= 'z'; r++ {
	fmt.Printf("%c", r)
}
fmt.Println()
// abcdefghijklmnopqrstuvwxyz
```

Voir [[faq-afficher-alphabet]] pour d'autres variantes (à l'envers, une lettre sur deux…).

## Le package unicode {#package-unicode}

Pour tester ou transformer un caractère, quelle que soit la langue :

```go
import "unicode"

unicode.IsLetter('é')   // true
unicode.IsDigit('7')    // true
unicode.IsSpace('\t')   // true
unicode.IsUpper('A')    // true
unicode.IsLower('a')    // true
unicode.IsPunct('!')    // true
unicode.ToUpper('é')    // 'É'
unicode.ToLower('Ç')    // 'ç'
```

Exemple : compter les voyelles, les lettres et les chiffres d'un texte.

```go
func analyser(s string) (lettres, chiffres int) {
	for _, r := range s {
		switch {
		case unicode.IsLetter(r):
			lettres++
		case unicode.IsDigit(r):
			chiffres++
		}
	}
	return
}
```

## Le package unicode/utf8 {#package-utf8}

```go
import "unicode/utf8"

utf8.RuneCountInString("héllo")       // 5 caractères
utf8.RuneLen('€')                     // 3 octets
utf8.ValidString("abc")               // true
r, taille := utf8.DecodeRuneInString("été") // 'é', 2
r, taille = utf8.DecodeLastRuneInString("été") // 'é', 2
```

`DecodeRuneInString` est utile pour lire le premier caractère d'une chaîne sans tout convertir en `[]rune`.

## Afficher des runes avec fmt {#fmt}

| Verbe | Résultat pour `'é'` |
|---|---|
| `%c` | `é` |
| `%q` | `'é'` |
| `%U` | `U+00E9` |
| `%d` | `233` |
| `%x` | `e9` |

:::warning fmt.Println(r) affiche un nombre
`fmt.Println('A')` affiche `65`, car une rune est un `int32`. Utilisez `%c`, ou convertissez : `fmt.Println(string('A'))`.
:::
