---
title: Types de base
category: bases
order: 3
level: débutant
summary: Go propose des booléens (bool), des entiers signés et non signés (int, int64, uint8…), des flottants (float64), des complexes, des chaînes (string) et deux alias, byte et rune.
aliases: type, types, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, uintptr, float, float32, float64, flottant, nombre décimal, entier, entiers, nombre, bool, booléen, boolean, complex, complex128, byte, rune, any, débordement, overflow, taille des types
related: variables, string, runes, conversions, operateurs, math-rand
questions:
  - Quels sont les types de base en Go ?
  - Quelle différence entre int, int32 et int64 ? -> entiers
  - Quelle est la valeur maximale d'un int ? -> limites
  - Pourquoi 0.1 + 0.2 ne vaut pas 0.3 ? -> flottants
  - Que se passe-t-il en cas de dépassement d'entier (overflow) ? -> debordement
  - Qu'est-ce que le type any ? -> any
---

@@ rapide

| Famille | Types | Valeur zéro |
|---|---|---|
| Booléen | `bool` | `false` |
| Entiers signés | `int`, `int8`, `int16`, `int32`, `int64` | `0` |
| Entiers non signés | `uint`, `uint8`, `uint16`, `uint32`, `uint64`, `uintptr` | `0` |
| Flottants | `float32`, `float64` | `0` |
| Complexes | `complex64`, `complex128` | `0` |
| Texte | `string` | `""` |
| Alias | `byte` = `uint8`, `rune` = `int32` | `0` |

En pratique, on utilise **`int`** pour les entiers, **`float64`** pour les décimaux, **`string`** pour le texte et **`bool`** pour vrai/faux. Go ne fait **aucune conversion implicite** : `int` + `float64` ne compile pas sans conversion.

@@ detail

## Les booléens {#booleens}

Le type `bool` vaut `true` ou `false`. Contrairement à d'autres langages, **rien d'autre n'est « vrai » ou « faux »** : un `if` exige une vraie expression booléenne.

```go
actif := true
if actif {
} // ok
n := 1
if n {
} // ❌ non-boolean condition in if statement
if n != 0 {
} // ✅
```

## Les entiers {#entiers}

| Type | Taille | Plage |
|---|---|---|
| `int8` | 8 bits | −128 à 127 |
| `int16` | 16 bits | −32 768 à 32 767 |
| `int32` | 32 bits | environ ±2,1 milliards |
| `int64` | 64 bits | environ ±9,2 × 10¹⁸ |
| `uint8` | 8 bits | 0 à 255 |
| `uint16` | 16 bits | 0 à 65 535 |
| `uint32` | 32 bits | 0 à environ 4,3 milliards |
| `uint64` | 64 bits | 0 à environ 1,8 × 10¹⁹ |
| `int` / `uint` | 32 ou 64 bits | selon la plateforme (64 bits sur les machines actuelles) |
| `uintptr` | taille d'un pointeur | usage bas niveau |

**Règle simple** : utilisez `int` par défaut. Prenez un type à taille fixe seulement si le format l'exige (fichier binaire, protocole réseau, base de données) ou pour économiser de la mémoire dans de très grands tableaux.

`int` et `int64` sont des **types différents**, même sur une machine 64 bits : il faut convertir explicitement.

```go
var a int = 10
var b int64 = 20
fmt.Println(a + b)        // ❌ mismatched types int and int64
fmt.Println(int64(a) + b) // ✅ 30
```

### Écrire des littéraux {#litteraux}

```go
dec := 1_000_000 // les _ rendent les grands nombres lisibles
hex := 0xFF      // 255
oct := 0o755     // 493
bin := 0b1010    // 10
car := 'A'       // rune : 65
```

## Limites et constantes du package math {#limites}

```go
import "math"

fmt.Println(math.MaxInt)    // 9223372036854775807 (sur 64 bits)
fmt.Println(math.MinInt64)  // -9223372036854775808
fmt.Println(math.MaxUint8)  // 255
fmt.Println(math.MaxFloat64)
```

## Le dépassement (overflow) {#debordement}

Les entiers **ne lèvent pas d'erreur** en cas de dépassement : ils « bouclent » silencieusement.

```go
var x int8 = 127
x++
fmt.Println(x) // -128

var u uint8 = 0
u--
fmt.Println(u) // 255
```

Si le dépassement est détectable à la compilation (constante), le compilateur refuse : `var y int8 = 200` donne `cannot use 200 (untyped int constant) as int8 value in variable declaration (overflows)`.

## Les flottants {#flottants}

`float64` (double précision) est le type par défaut des décimaux : `x := 3.14` est un `float64`. `float32` sert surtout pour économiser de la mémoire (graphisme, grands volumes).

Comme dans tous les langages qui utilisent la norme IEEE 754, les flottants sont des **approximations** :

```go
fmt.Println(0.1 + 0.2)      // 0.30000000000000004
fmt.Println(0.1+0.2 == 0.3) // false
```

Pour comparer deux flottants, on vérifie que l'écart est très petit :

```go
const epsilon = 1e-9
if math.Abs(a-b) < epsilon {
	fmt.Println("égaux")
}
```

:::danger Jamais de float pour de l'argent
Pour des montants, utilisez des **entiers en centimes** (`int64`) ou un package décimal dédié. Les erreurs d'arrondi des flottants s'accumulent.
:::

Valeurs spéciales : `math.Inf(1)` (+∞), `math.NaN()` (« pas un nombre »). Une division flottante par zéro donne `+Inf`, alors qu'une division **entière** par zéro provoque un `panic`.

## Les nombres complexes {#complexes}

Rarement utilisés, mais intégrés au langage :

```go
c := complex(3, 4)            // complex128 : (3+4i)
fmt.Println(real(c), imag(c)) // 3 4
fmt.Println(cmplx.Abs(c))     // 5  (package math/cmplx)
```

## byte et rune {#byte-rune}

- `byte` est un **alias** de `uint8` : il représente un octet.
- `rune` est un **alias** de `int32` : il représente un **point de code Unicode** (un caractère).

```go
var b byte = 'A' // 65
var r rune = 'é' // 233
```

Voir [[runes]] pour comprendre la différence en profondeur.

## string {#string}

Une chaîne est une séquence **immuable** d'octets, en général du texte UTF-8. Voir [[string]].

## any {#any}

`any` est un alias de `interface{}`, l'interface vide : une variable de type `any` peut contenir **n'importe quelle valeur**. Pour l'utiliser, il faut retrouver le type concret avec une assertion de type. Voir [[interfaces]].

```go
var x any = 42
x = "texte"      // ok
n, ok := x.(int) // ok == false : x contient maintenant une string
```

## Connaître le type d'une valeur {#connaitre-type}

```go
x := 42
fmt.Printf("%T\n", x)   // int
fmt.Printf("%T\n", 4.2) // float64
fmt.Printf("%T\n", 'a') // int32 (une rune)
```
