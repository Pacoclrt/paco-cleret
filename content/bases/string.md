---
title: Les chaînes de caractères (string)
category: bases
order: 4
level: débutant
summary: Une string est une séquence immuable d'octets, contenant en général du texte encodé en UTF-8. len donne le nombre d'octets, pas de caractères.
aliases: string, strings, chaîne, chaine, chaînes, chaine de caractere, chaîne de caractères, texte, str, caractères, concaténation, concaténer, multiligne, raw string, backtick, guillemets, sous-chaîne, substring, immuable
related: runes, package-strings, conversions, fmt, faq-inverser-string, faq-concat-rapide
questions:
  - Qu'est-ce qu'une string en Go ?
  - Comment concaténer des chaînes de caractères ? -> concatenation
  - Pourquoi len("é") vaut 2 ? -> longueur
  - Comment écrire une chaîne sur plusieurs lignes ? -> litteraux
  - Comment modifier un caractère d'une string ? -> immuable
  - Comment extraire une sous-chaîne ? -> sous-chaines
  - Comment parcourir les caractères d'une chaîne ? -> parcourir
  - Comment comparer deux chaînes ? -> comparer
---

@@ rapide

Une **string** est une suite d'**octets** (`byte`) **immuable**, qui contient en général du texte en **UTF-8**.

```go
s := "Bonjour, 世界"
fmt.Println(len(s))                    // 15 : nombre d'OCTETS
fmt.Println(utf8.RuneCountInString(s)) // 11 : nombre de caractères
fmt.Println(s[0])                      // 66 : un octet (le 'B')
fmt.Println(s + " !")                  // concaténation

for i, r := range s { // r est une rune (un caractère)
	fmt.Println(i, string(r))
}
```

À retenir :

- **`len(s)`** compte les **octets** : un caractère accentué en occupe 2, un idéogramme 3.
- **`s[i]`** renvoie un **octet**, pas un caractère. Pour les caractères, utilisez `range` ou `[]rune(s)`.
- Une string **ne se modifie pas** : on en crée une nouvelle.
- Pour construire une chaîne en boucle, utilisez **`strings.Builder`**.

@@ detail

## Les littéraux de chaîne {#litteraux}

Deux syntaxes existent :

```go
// Chaîne interprétée : entre guillemets doubles, avec séquences d'échappement
a := "Ligne 1\nLigne 2\t(tabulation) \"guillemets\" \\ antislash"

// Chaîne brute (raw string) : entre backticks, rien n'est interprété
b := `C:\Users\paco\Documents
Les \n restent des \n.
Pratique pour les regex : \d+\.\d+`
```

| Échappement | Signification |
|---|---|
| `\n` | saut de ligne |
| `\t` | tabulation |
| `\"` | guillemet double |
| `\\` | antislash |
| `\r` | retour chariot |
| `\u00e9` | caractère Unicode (ici é) |
| `\x41` | octet en hexadécimal (ici A) |

Les **chaînes brutes** sont idéales pour le texte multiligne, les expressions régulières, le JSON ou les chemins Windows. Elles ne peuvent pas contenir de backtick.

## Ce qu'est vraiment une string {#representation}

En mémoire, une string est une petite structure de deux mots : un **pointeur** vers les octets et une **longueur**. Copier une string (l'affecter, la passer à une fonction) est donc **très peu coûteux** : on copie le pointeur, pas le texte.

Go ne vérifie pas que le contenu est de l'UTF-8 valide : une string peut contenir **n'importe quels octets**. Mais le code source Go est en UTF-8, donc les littéraux le sont, et tout l'écosystème suppose de l'UTF-8.

## Longueur : octets contre caractères {#longueur}

```go
s := "café"
fmt.Println(len(s))                    // 5 : c, a, f = 1 octet chacun, é = 2 octets
fmt.Println(utf8.RuneCountInString(s)) // 4 caractères
fmt.Println(len([]rune(s)))            // 4 aussi (mais alloue une slice)
```

| Caractère | Octets en UTF-8 |
|---|---|
| ASCII (`a`, `Z`, `7`, `!`) | 1 |
| Latin accentué (`é`, `ç`, `ñ`) | 2 |
| Asiatique (`世`, `界`) | 3 |
| Emoji, symboles rares | 4 |

Voir [[runes]] pour comprendre l'UTF-8 en profondeur.

## Accéder aux octets et caractères {#acces}

```go
s := "héllo"
fmt.Println(s[0])         // 104 : l'octet 'h'
fmt.Println(string(s[0])) // "h"
fmt.Println(s[1])         // 195 : PREMIER octet du 'é' (qui en a deux)

runes := []rune(s)
fmt.Println(string(runes[1])) // "é" : le 2e caractère
```

Indexer une string renvoie toujours un **byte**. Dès que le texte peut contenir des caractères non ASCII, raisonnez en **runes**.

## Parcourir une chaîne {#parcourir}

```go
s := "Go €"

// Par caractères (runes) : la bonne méthode pour du texte
for i, r := range s {
	fmt.Printf("%d: %c\n", i, r)
}
// 0: G
// 1: o
// 2:
// 3: €     ← € commence à l'octet 3 et en occupe 3

// Par octets
for i := 0; i < len(s); i++ {
	fmt.Printf("%x ", s[i])
}
// 47 6f 20 e2 82 ac
```

Avec `range`, l'index `i` est la **position en octets** du début du caractère, et `r` la **rune** décodée.

## Les strings sont immuables {#immuable}

```go
s := "bonjour"
s[0] = 'B' // ❌ cannot assign to s[0] (neither addressable nor a map index expression)
```

Pour « modifier » une chaîne, on en construit une nouvelle :

```go
s = "B" + s[1:] // "Bonjour"

r := []rune(s) // conversion en slice modifiable
r[0] = 'b'
s = string(r) // "bonjour"

s = strings.Replace(s, "o", "0", 1) // "b0njour"
```

## Concaténation {#concatenation}

```go
prenom, nom := "Ada", "Lovelace"

a := prenom + " " + nom                         // opérateur +
b := fmt.Sprintf("%s %s (%d)", prenom, nom, 36) // formatage
c := strings.Join([]string{prenom, nom}, " ")   // depuis une slice
```

Dans une **boucle**, `+=` recrée une nouvelle chaîne à chaque tour (coût quadratique). Utilisez `strings.Builder` :

```go
var sb strings.Builder
for i := range 3 {
	fmt.Fprintf(&sb, "ligne %d\n", i)
}
sb.WriteString("fin")
resultat := sb.String()
```

Voir [[faq-concat-rapide]] pour les performances.

## Sous-chaînes {#sous-chaines}

L'opération de découpage `s[début:fin]` fonctionne sur les **octets**, `fin` exclu :

```go
s := "Bonjour le monde"
fmt.Println(s[0:7]) // "Bonjour"
fmt.Println(s[8:])  // "le monde"
fmt.Println(s[:3])  // "Bon"
```

:::warning Attention aux caractères multi-octets
`"été"[0:1]` donne un octet isolé qui n'est pas un caractère valide (affiché `�`). Avec du texte accentué, convertissez en `[]rune` d'abord : `string([]rune(s)[0:1])` donne `"é"`.
:::

Une sous-chaîne **partage la mémoire** de la chaîne d'origine (pas de copie). Si vous gardez une toute petite sous-chaîne d'une énorme chaîne, toute la grande reste en mémoire : `strings.Clone` en fait une copie indépendante.

## Comparer des chaînes {#comparer}

```go
"abc" == "abc"                // true
"abc" < "abd"                 // true : ordre lexicographique (octet par octet)
strings.EqualFold("Go", "GO") // true : insensible à la casse
strings.Compare("a", "b")     // -1
```

L'ordre `<` compare les **octets** : `"Z" < "a"` est vrai (les majuscules ASCII viennent avant les minuscules), et `"é"` vient après `"z"`.

## Conversions courantes {#conversions}

```go
strconv.Itoa(42)           // "42"
strconv.Atoi("42")         // 42, nil
[]byte("abc")              // [97 98 99]
string([]byte{97, 98, 99}) // "abc"
string('A')                // "A" (depuis une rune)
string(rune(65))           // "A"
```

:::danger Le piège string(int)
`string(65)` ne donne **pas** `"65"` mais `"A"` (le caractère de code 65). Pour convertir un nombre en texte, utilisez `strconv.Itoa`. `go vet` vous avertit de ce piège.
:::

Voir [[conversions]] et [[faq-int-string]].

## La boîte à outils : le package strings {#package-strings}

Le package `strings` contient tout le nécessaire : `Contains`, `Split`, `Join`, `Replace`, `ToUpper`, `TrimSpace`, `HasPrefix`, `Fields`, `Index`… Tout est détaillé dans [[package-strings]].

```go
strings.ToUpper("go")            // "GO"
strings.Split("a,b,c", ",")      // ["a" "b" "c"]
strings.Contains("gopher", "go") // true
strings.TrimSpace("  salut \n")  // "salut"
```
