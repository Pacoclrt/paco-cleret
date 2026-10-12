---
title: Variables
category: bases
order: 1
level: débutant
summary: On déclare une variable avec var (type explicite ou déduit) ou avec := dans une fonction. Toute variable a une valeur zéro par défaut et doit être utilisée.
aliases: variable, variables, var, :=, déclaration, déclarer, affectation, assignation, valeur zéro, zero value, valeur par défaut, portée, scope, shadowing, masquage, identifiant vide, underscore, _
related: constantes, types-de-base, conversions, faq-erreurs-compilation
questions:
  - Comment déclarer une variable en Go ?
  - Quelle différence entre var et := ? -> var-ou-courte
  - Quelle est la valeur par défaut d'une variable ? -> valeur-zero
  - Qu'est-ce que le shadowing (masquage) de variable ? -> shadowing
  - À quoi sert l'underscore _ ? -> identifiant-vide
  - Pourquoi ai-je l'erreur « declared and not used » ? -> inutilisee
---

@@ rapide

Deux façons de déclarer une variable :

```go
var age int = 25 // forme complète
var nom = "Ada"  // type déduit : string
ville := "Lyon"  // déclaration courte (uniquement dans une fonction)
```

- Une variable déclarée sans valeur reçoit sa **valeur zéro** : `0`, `""`, `false` ou `nil`.
- Le **type ne change jamais** après la déclaration : `age = "vingt"` ne compile pas.
- Une variable locale **déclarée mais jamais utilisée** est une erreur de compilation.
- `:=` déclare **et** affecte ; `=` affecte une variable qui existe déjà.

@@ detail

## Déclarer avec var {#var}

La forme générale est `var nom type = valeur`. On peut omettre le type **ou** la valeur, mais pas les deux :

```go
var a int = 10 // type et valeur
var b int      // type seul : b vaut 0
var c = 10     // valeur seule : type int déduit
```

On peut déclarer plusieurs variables d'un coup, éventuellement dans un bloc :

```go
var x, y int = 1, 2
var nom, age = "Ada", 36 // types différents : string et int

var (
	hote  = "localhost"
	port  = 8080
	debug bool
)
```

`var` fonctionne **partout** : au niveau du package (variables globales) comme dans une fonction.

## La déclaration courte := {#declaration-courte}

Dans une fonction, on utilise le plus souvent `:=`, qui déclare et initialise en déduisant le type :

```go
func main() {
	message := "bonjour" // string
	compteur := 0        // int
	prix := 19.99        // float64
	actif := true        // bool
	a, b := 1, "deux"    // plusieurs à la fois
}
```

Règles à connaître :

- `:=` est **interdit hors d'une fonction** (au niveau du package, il faut `var`).
- À gauche de `:=`, **au moins une variable doit être nouvelle**. Les autres sont simplement réaffectées :

```go
f, err := os.Open("a.txt") // f et err sont nouvelles
g, err := os.Open("b.txt") // ok : g est nouvelle, err est réaffectée
g, err := os.Open("c.txt") // ❌ no new variables on left side of :=
```

## var ou := ? {#var-ou-courte}

| Situation | Choix idiomatique |
|---|---|
| Variable locale initialisée avec une valeur | `x := valeur` |
| Variable qui doit commencer à sa valeur zéro | `var total int` |
| Type différent de celui déduit | `var ratio float64 = 1` |
| Variable de package | `var` (obligatoire) |

```go
var somme int // explicite : on part de zéro
for _, v := range nombres {
	somme += v
}
```

## Les valeurs zéro {#valeur-zero}

En Go, **il n'existe pas de variable non initialisée**. Toute variable déclarée sans valeur reçoit la **valeur zéro** de son type :

| Type | Valeur zéro |
|---|---|
| `int`, `float64`, tous les nombres | `0` |
| `string` | `""` (chaîne vide) |
| `bool` | `false` |
| pointeur, slice, map, channel, fonction, interface | `nil` |
| struct | chaque champ à sa valeur zéro |
| array | chaque élément à sa valeur zéro |

```go
var s []int
fmt.Println(s == nil, len(s)) // true 0
```

:::tip Rendre la valeur zéro utile
Un bon type Go est utilisable directement à sa valeur zéro. Par exemple `var mu sync.Mutex` ou `var sb strings.Builder` sont prêts à l'emploi, sans constructeur.
:::

## Affectation {#affectation}

```go
x := 1
x = 2  // réaffectation
x += 3 // x = x + 3
x++    // x = x + 1 (instruction, pas une expression)

a, b := 1, 2
a, b = b, a // échange en une ligne : a=2, b=1
```

L'affectation multiple évalue d'abord **toutes** les valeurs de droite, puis affecte. C'est ce qui permet l'échange sans variable temporaire.

## Portée (scope) {#portee}

Une variable n'existe que dans le **bloc** `{ }` où elle est déclarée, et dans ses sous-blocs :

```go
func main() {
	x := 1
	if x > 0 {
		y := 2
		fmt.Println(x, y) // ok
	}
	fmt.Println(y) // ❌ undefined: y
}
```

Les variables déclarées dans l'en-tête d'un `if`, `for` ou `switch` n'existent que dans cette instruction.

## Le masquage (shadowing) {#shadowing}

Redéclarer avec `:=` une variable dans un bloc intérieur crée une **nouvelle** variable qui **masque** l'ancienne. C'est une source de bugs classique :

```go
func charger() error {
	var err error
	if vrai {
		_, err := os.Open("x.txt") // ⚠️ nouvelle variable err, locale au if
		_ = err
	}
	return err // toujours nil !
}
```

Correction : utiliser `=` dans le bloc intérieur pour réaffecter la variable existante.

```go
if vrai {
	_, err = os.Open("x.txt") // réaffecte l'err extérieure
}
```

L'outil `go vet -vettool=$(which shadow)` ou les linters (`golangci-lint`) peuvent détecter les masquages suspects.

## L'identifiant vide _ {#identifiant-vide}

L'underscore `_` est un « trou noir » : on y affecte une valeur qu'on veut **ignorer**.

```go
for _, v := range liste {
} // on ignore l'index
_, err := strconv.Atoi("42")      // on ignore le résultat
var _ io.Reader = (*MonType)(nil) // vérifie à la compilation que MonType implémente io.Reader
```

## Variable inutilisée {#inutilisee}

Une variable **locale** déclarée mais jamais lue empêche la compilation :

```text
./main.go:4:2: declared and not used: x
```

C'est volontaire : une variable inutilisée signale souvent un bug. Supprimez-la, ou affectez-la à `_` temporairement. Les variables de **package** et les paramètres de fonction ne sont pas concernés.

## Conventions de nommage {#nommage}

- `camelCase` pour les variables locales et privées, `PascalCase` pour les exportées.
- Des noms **courts** pour une portée courte (`i`, `v`, `err`), plus descriptifs pour une portée longue.
- Les acronymes restent en majuscules : `userID`, `httpURL`, pas `userId`.
- Pas d'underscore (`max_value` n'est pas idiomatique).

Voir aussi [[conventions]].
