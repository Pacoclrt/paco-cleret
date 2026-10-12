---
title: Maths et nombres aléatoires
category: stdlib
order: 8
level: débutant
summary: Le package math fournit les constantes et fonctions mathématiques (Sqrt, Pow, Round, Abs…), math/rand/v2 génère des nombres pseudo-aléatoires, crypto/rand des nombres aléatoires sûrs, et math/big les très grands nombres.
aliases: math, maths, mathématiques, sqrt, racine carrée, pow, puissance, abs, valeur absolue, round, arrondi, floor, ceil, arrondir, pi, max, min, aléatoire, random, hasard, rand, math/rand, nombre aléatoire, tirage, mélanger, shuffle, crypto/rand, big, math/big, grands nombres, nan, infini, modulo float
related: types-de-base, operateurs, conversions
questions:
  - Comment générer un nombre aléatoire en Go ?
  - Comment calculer une racine carrée ou une puissance ? -> fonctions
  - Comment arrondir un nombre ? -> arrondis
  - Comment calculer la valeur absolue d'un entier ? -> entiers
  - Comment mélanger une slice ? -> aleatoire
  - Comment générer un mot de passe ou un jeton sécurisé ? -> crypto-rand
  - Comment manipuler de très grands nombres ? -> big
---

@@ rapide

```go
import (
	"math"
	"math/rand/v2"
)

math.Sqrt(16)       // 4
math.Pow(2, 10)     // 1024
math.Abs(-3.5)      // 3.5
math.Round(2.5)     // 3
math.Floor(2.7)     // 2
math.Ceil(2.1)      // 3
math.Pi             // 3.141592653589793
max(3, 7, 1)        // 7 (intégré au langage, Go 1.21+)

rand.IntN(100)      // entier aléatoire dans [0, 100)
rand.Float64()      // flottant dans [0.0, 1.0)
rand.Shuffle(len(s), func(i, j int) { s[i], s[j] = s[j], s[i] })
```

Les fonctions de `math` travaillent sur des **`float64`** : convertissez vos entiers (`math.Sqrt(float64(n))`). Pour tout ce qui touche à la **sécurité** (mots de passe, jetons), utilisez `crypto/rand`, jamais `math/rand`.

@@ detail

## Constantes {#constantes}

| Constante | Valeur |
|---|---|
| `math.Pi` | 3.141592653589793 |
| `math.E` | 2.718281828459045 |
| `math.Sqrt2` | 1.4142135623730951 |
| `math.MaxInt`, `math.MinInt` | bornes de `int` |
| `math.MaxInt64`, `math.MaxUint32`… | bornes des types à taille fixe |
| `math.MaxFloat64` | ≈ 1.8 × 10³⁰⁸ |
| `math.SmallestNonzeroFloat64` | ≈ 4.9 × 10⁻³²⁴ |

## Fonctions usuelles {#fonctions}

```go
math.Sqrt(2)          // 1.4142135623730951
math.Cbrt(27)         // 3   (racine cubique)
math.Pow(2, 0.5)      // 1.4142135623730951
math.Exp(1)           // 2.718281828459045
math.Log(math.E)      // 1   (logarithme népérien)
math.Log10(1000)      // 3
math.Log2(8)          // 3
math.Hypot(3, 4)      // 5   (hypoténuse)
math.Mod(7.5, 2)      // 1.5 (reste flottant)
math.Sin(math.Pi / 2) // 1   (angles en radians)
```

Pour convertir des degrés en radians : `rad := deg * math.Pi / 180`.

## Arrondis {#arrondis}

| Fonction | 2.5 | -2.5 | 2.4 |
|---|---|---|---|
| `math.Round` (au plus proche, .5 s'éloigne de zéro) | 3 | -3 | 2 |
| `math.RoundToEven` (au plus proche, .5 vers le pair) | 2 | -2 | 2 |
| `math.Floor` (vers -∞) | 2 | -3 | 2 |
| `math.Ceil` (vers +∞) | 3 | -2 | 3 |
| `math.Trunc` (vers zéro) | 2 | -2 | 2 |

Arrondir à n décimales :

```go
func Arrondir(x float64, decimales int) float64 {
	p := math.Pow(10, float64(decimales))
	return math.Round(x*p) / p
}

Arrondir(3.14159, 2) // 3.14
```

Pour l'**affichage** seulement, `fmt.Sprintf("%.2f", x)` suffit.

## Calculs sur les entiers {#entiers}

Le package `math` ne travaille qu'en `float64`. Pour les entiers :

```go
// Valeur absolue
func Abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// Puissance entière (exacte, contrairement à math.Pow sur de grands nombres)
func PuissanceInt(base, exp int) int {
	res := 1
	for range exp {
		res *= base
	}
	return res
}

// Min et max intégrés (Go 1.21+), pour tous les types ordonnés
min(3, 1, 2)       // 1
max("a", "b")      // "b"

// Division arrondie au supérieur
pages := (total + parPage - 1) / parPage
```

## Valeurs spéciales des flottants {#speciales}

```go
inf := math.Inf(1)          // +Inf
nan := math.NaN()           // NaN
fmt.Println(1.0/0.0 == inf) // erreur de compilation : division par zéro constante
x := 0.0
fmt.Println(1 / x)                               // +Inf (à l'exécution)
fmt.Println(math.IsNaN(nan), math.IsInf(inf, 1)) // true true
fmt.Println(nan == nan)                          // false : NaN n'est égal à rien, pas même à lui-même
```

## Nombres aléatoires : math/rand/v2 {#aleatoire}

```go
import "math/rand/v2"

rand.IntN(6) + 1          // dé à 6 faces : 1 à 6
rand.N(100)               // générique : marche avec int, int64, time.Duration…
rand.N(5 * time.Second)   // durée aléatoire entre 0 et 5 s
rand.Float64()            // [0.0, 1.0)
rand.Perm(5)              // permutation aléatoire de [0 1 2 3 4]

fruits := []string{"pomme", "poire", "kiwi", "mangue"}
choix := fruits[rand.IntN(len(fruits))] // élément au hasard

rand.Shuffle(len(fruits), func(i, j int) { // mélanger sur place
	fruits[i], fruits[j] = fruits[j], fruits[i]
})
```

Un entier dans un intervalle `[min, max]` inclus : `min + rand.IntN(max-min+1)`.

:::info Plus besoin de rand.Seed
Depuis Go 1.20, le générateur global est **initialisé aléatoirement** au démarrage : les tirages diffèrent à chaque exécution. `math/rand/v2` (Go 1.22) n'a même plus de fonction `Seed` globale. Pour des tirages **reproductibles** (tests, simulations), créez un générateur avec une graine fixe :

```go
r := rand.New(rand.NewPCG(42, 1024)) // même graine = même séquence
fmt.Println(r.IntN(100))
```
:::

L'ancien package `math/rand` (sans `/v2`) existe toujours, avec `rand.Intn` (n minuscule).

## Aléatoire cryptographique : crypto/rand {#crypto-rand}

`math/rand` est **prévisible** : ne l'utilisez jamais pour des mots de passe, des jetons de session ou des clés. Utilisez `crypto/rand` :

```go
import (
	"crypto/rand"
	"encoding/hex"
)

octets := make([]byte, 32)
rand.Read(octets)                 // remplit avec des octets aléatoires sûrs
jeton := hex.EncodeToString(octets) // 64 caractères hexadécimaux

texte := rand.Text()              // Go 1.24+ : chaîne aléatoire sûre en base32
```

## Très grands nombres : math/big {#big}

Quand `int64` ne suffit plus :

```go
import "math/big"

f := big.NewInt(1)
for i := int64(2); i <= 50; i++ {
	f.Mul(f, big.NewInt(i)) // f = f * i
}
fmt.Println(f) // 30414093201713378043612608166064768844377641568960512000000000000

n, ok := new(big.Int).SetString("123456789012345678901234567890", 10)
```

`big.Int` (entiers), `big.Float` (flottants de précision arbitraire) et `big.Rat` (fractions exactes). Les méthodes modifient le receiver et le renvoient, ce qui permet de les enchaîner.

## Détecter un dépassement {#depassement}

Les entiers « bouclent » silencieusement (voir [[types-de-base#debordement]]). Pour vérifier une multiplication :

```go
import "math/bits"

hi, lo := bits.Mul64(a, b)
if hi != 0 {
	return errors.New("dépassement")
}
_ = lo
```
