---
title: Conversions de types
category: bases
order: 7
level: débutant
summary: Go ne convertit jamais implicitement. On convertit entre nombres avec T(v), et entre texte et nombres avec le package strconv (Itoa, Atoi, ParseFloat…).
aliases: conversion, conversions, convertir, cast, caster, transtypage, transformer, strconv, itoa, atoi, parseint, parsefloat, parsebool, formatint, formatfloat, int en string, string en int, float en int, int en float, nombre en texte, texte en nombre, arrondir
related: types-de-base, string, runes, faq-int-string, fmt
questions:
  - Comment convertir un type en un autre en Go ?
  - Comment convertir une string en int ? -> string-vers-nombre
  - Comment convertir un int en string ? -> nombre-vers-string
  - Comment convertir un float en int ? -> numeriques
  - Comment arrondir un float ? -> numeriques
  - Pourquoi string(65) donne "A" ? -> piege-string-int
  - Quelle différence entre conversion et assertion de type ? -> assertion
---

@@ rapide

```go
// Entre types numériques : T(valeur)
i := 42
f := float64(i) // 42.0
n := int(3.99)  // 3 (tronqué, pas arrondi)

// Nombre → texte
s := strconv.Itoa(42)  // "42"
s2 := fmt.Sprint(3.14) // "3.14"

// Texte → nombre (peut échouer : on vérifie l'erreur)
v, err := strconv.Atoi("123") // 123, nil
x, err := strconv.ParseFloat("3.5", 64)

// Texte ↔ octets / caractères
b := []byte("salut")
r := []rune("héllo")
```

Règle d'or : **pas de conversion implicite**. `int + float64` ne compile pas, et **jamais** `string(42)` pour obtenir `"42"`.

@@ detail

## La syntaxe T(v) {#syntaxe}

Pour convertir une valeur `v` vers le type `T`, on écrit `T(v)`. C'est possible quand les deux types sont compatibles : entre types numériques, entre une string et des `[]byte`/`[]rune`, ou entre deux types qui partagent le même type sous-jacent.

```go
var a int = 10
var b float64 = 2.5

total := float64(a) * b // 25
fmt.Println(a * b)      // ❌ invalid operation: mismatched types int and float64
```

## Conversions numériques {#numeriques}

```go
f := 3.99
fmt.Println(int(f))                      // 3   : troncature vers zéro
fmt.Println(int(-3.99))                  // -3
fmt.Println(math.Round(f))               // 4   : arrondi au plus proche (reste un float64)
fmt.Println(int(math.Round(f)))          // 4
fmt.Println(math.Floor(f), math.Ceil(f)) // 3 4

var grand int64 = 300
fmt.Println(int8(grand)) // 44 : dépassement silencieux (300 - 256)
```

:::warning Perte d'information
Convertir vers un type plus petit (`int64` → `int8`) ou d'un flottant vers un entier peut perdre de l'information **sans erreur**. Vérifiez les bornes vous-même si nécessaire (`if n > math.MaxInt8 { … }`).
:::

Arrondir à 2 décimales :

```go
x := 3.14159
arrondi := math.Round(x*100) / 100 // 3.14
fmt.Printf("%.2f\n", x)            // pour l'affichage seulement : "3.14"
```

## Texte vers nombre {#string-vers-nombre}

Le package `strconv` (*string conversion*) fait le travail. Ces fonctions **renvoient une erreur** si la chaîne n'est pas un nombre valide : vérifiez-la toujours.

```go
n, err := strconv.Atoi("42")
if err != nil {
	fmt.Println("pas un entier :", err)
	return
}
fmt.Println(n + 1) // 43

_, err = strconv.Atoi("42abc")
fmt.Println(err) // strconv.Atoi: parsing "42abc": invalid syntax
```

| Fonction | Résultat | Exemple |
|---|---|---|
| `strconv.Atoi(s)` | `int` | `Atoi("-7")` → `-7` |
| `strconv.ParseInt(s, base, bits)` | `int64` | `ParseInt("ff", 16, 64)` → `255` |
| `strconv.ParseUint(s, base, bits)` | `uint64` | `ParseUint("1010", 2, 8)` → `10` |
| `strconv.ParseFloat(s, bits)` | `float64` | `ParseFloat("3.14", 64)` → `3.14` |
| `strconv.ParseBool(s)` | `bool` | `ParseBool("true")` → `true` (accepte aussi `1`, `t`, `TRUE`…) |

Le paramètre `bits` indique la taille cible : `ParseInt("300", 10, 8)` renvoie une erreur `value out of range`. La base `0` détecte le préfixe (`0x`, `0b`, `0o`).

:::tip Espaces
`Atoi(" 42")` échoue à cause de l'espace. Nettoyez l'entrée avec `strings.TrimSpace` avant de convertir, surtout si elle vient du clavier ou d'un fichier.
:::

## Nombre vers texte {#nombre-vers-string}

```go
strconv.Itoa(42)                         // "42"
strconv.FormatInt(255, 16)               // "ff"
strconv.FormatInt(5, 2)                  // "101"
strconv.FormatFloat(3.14159, 'f', 2, 64) // "3.14"
strconv.FormatBool(true)                 // "true"
strconv.Quote("salut\n")                 // "\"salut\\n\""

fmt.Sprint(42)                 // "42" (plus lent mais universel)
fmt.Sprintf("%05.1f", 3.14159) // "003.1"
```

`strconv` est plus rapide que `fmt.Sprintf`, mais pour un affichage ponctuel la différence ne compte pas.

## Le piège string(int) {#piege-string-int}

```go
n := 65
fmt.Println(string(n))       // "A" !  (le caractère de code 65)
fmt.Println(strconv.Itoa(n)) // "65" ✅
```

`string(entier)` interprète l'entier comme un **point de code Unicode**. `go vet` signale ce cas : *conversion from int to string yields a string of one rune*. Si vous voulez vraiment un caractère, écrivez `string(rune(n))` pour que l'intention soit claire.

## Texte, octets et runes {#texte-octets}

```go
s := "héllo"
b := []byte(s)  // [104 195 169 108 108 111] : 6 octets
r := []rune(s)  // [104 233 108 108 111]     : 5 caractères
s1 := string(b) // "héllo"
s2 := string(r) // "héllo"
```

Voir [[runes]].

## Types personnalisés {#types-nommes}

On peut convertir entre deux types qui ont le **même type sous-jacent** :

```go
type Celsius float64
type Fahrenheit float64

c := Celsius(100)
f := Fahrenheit(c*9/5 + 32) // conversion explicite obligatoire
```

Voir [[types-personnalises]].

## Conversion ou assertion de type ? {#assertion}

- La **conversion** `T(v)` transforme une valeur d'un type concret vers un autre, et est vérifiée à la compilation.
- L'**assertion** `v.(T)` extrait le type concret d'une **interface**, et est vérifiée à l'exécution.

```go
var x any = 42
n := x.(int)        // assertion : x contient-il un int ?
f := float64(n)     // conversion
s, ok := x.(string) // ok == false, pas de panic
```

Voir [[interfaces#assertion-de-type|les assertions de type]].
