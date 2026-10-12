---
title: Que signifient les erreurs de compilation courantes ?
category: faq
order: 17
level: débutant
summary: Les erreurs les plus fréquentes : variable ou import inutilisé, accolade sur la mauvaise ligne, types incompatibles, := sans nouvelle variable, nom non exporté. Chacune a une correction simple.
aliases: erreur de compilation, erreurs de compilation, declared and not used, imported and not used, undefined, mismatched types, cannot use, no new variables on left side of :=, missing return, syntax error unexpected newline, non-name on left side, unexported, compile error, ne compile pas
related: variables, premier-programme, packages, conversions, faq-nil-interface
questions:
  - Que signifie « declared and not used » ? -> declared-not-used
  - Que signifie « imported and not used » ? -> imported-not-used
  - Que signifie « undefined » ? -> undefined
  - Que signifie « mismatched types » ou « cannot use … as … value » ? -> types
  - Que signifie « no new variables on left side of := » ? -> no-new-variables
  - Que signifie « missing return » ? -> missing-return
  - Que signifie « syntax error unexpected newline » ? -> syntax-error
---

@@ rapide

| Message | Cause | Correction |
|---|---|---|
| `declared and not used: x` | variable locale jamais lue | l'utiliser, la supprimer ou `_ = x` |
| `"os" imported and not used` | import inutile | le supprimer (`goimports` le fait) |
| `undefined: x` | nom inconnu, faute de frappe, hors de portée | vérifier l'orthographe et la portée |
| `mismatched types int and float64` | opération entre types différents | convertir : `float64(n)` |
| `cannot use x (… type A) as B value` | mauvais type passé ou affecté | convertir ou corriger le type |
| `no new variables on left side of :=` | `:=` sur des variables existantes | utiliser `=` |
| `missing return` | un chemin de la fonction ne renvoie rien | ajouter un `return` final |
| `syntax error: unexpected newline` | accolade `{` sur la ligne suivante | mettre `{` en fin de ligne |

Le compilateur Go est strict, mais ses messages sont précis : lisez le **fichier:ligne:colonne** indiqué.

@@ detail

## declared and not used {#declared-not-used}

```go
func main() {
	x := 10 // ❌ declared and not used: x
}
```

Go refuse les variables **locales** déclarées mais jamais lues : c'est souvent un bug (variable mal nommée, calcul oublié). Solutions : utiliser la variable, la supprimer, ou l'ignorer temporairement avec `_ = x`. Une variable seulement **affectée** (`x = 5`) ne compte pas comme utilisée.

## imported and not used {#imported-not-used}

```go
import (
	"fmt"
	"os" // ❌ "os" imported and not used
)
```

Supprimez l'import. Configurez votre éditeur avec `goimports` (ou `gopls`) pour ajouter et retirer les imports automatiquement à l'enregistrement. Pour garder un import uniquement pour ses effets de bord : `import _ "image/png"`.

## undefined {#undefined}

```go
fmt.Prinln("x")    // ❌ undefined: fmt.Prinln (faute de frappe)
fmt.println("x")   // ❌ undefined: fmt.println (minuscule : non exporté… et inexistant)
fmt.Println(total) // ❌ undefined: total (pas déclaré, ou déclaré dans un autre bloc)
```

Causes fréquentes :

- faute de frappe ou de **casse** (Go est sensible à la casse) ;
- variable déclarée dans un bloc `if`/`for` et utilisée en dehors (voir [[variables#portee]]) ;
- fonction d'un autre fichier du même package non incluse : lancez `go run .` plutôt que `go run main.go` ;
- élément **non exporté** d'un autre package (minuscule) : `cannot refer to unexported name` ou `undefined`.

## mismatched types / cannot use {#types}

```go
var a int = 5
var b float64 = 2.5
c := a * b          // ❌ invalid operation: a * b (mismatched types int and float64)
c := float64(a) * b // ✅

var s string = 42                     // ❌ cannot use 42 (untyped int constant) as string value
var d time.Duration = n * time.Second // ❌ si n est un int : time.Duration(n) * time.Second
```

Go ne fait **aucune conversion implicite**. Voir [[conversions]].

## no new variables on left side of := {#no-new-variables}

```go
err := faireA()
err := faireB() // ❌ no new variables on left side of :=
err = faireB()  // ✅
```

`:=` **déclare** : au moins une variable à gauche doit être nouvelle. Pour réaffecter, utilisez `=`.

## missing return {#missing-return}

```go
func signe(n int) string {
	if n > 0 {
		return "positif"
	} else if n < 0 {
		return "négatif"
	}
	// ❌ missing return : que renvoyer si n == 0 ?
}
```

Le compilateur exige un `return` sur **tous** les chemins, même s'ils vous semblent impossibles. Ajoutez un `return` final (ou un `panic` pour un cas vraiment impossible).

## syntax error: unexpected newline {#syntax-error}

```go
func main()
{                 // ❌ syntax error: unexpected semicolon or newline before {
}

if x > 0 {
}
else {            // ❌ syntax error: else must be followed by if or statement block
}
```

Go insère automatiquement un `;` en fin de ligne : l'accolade ouvrante et le `else` doivent être sur la **même ligne** que ce qui précède. `gofmt` ne peut pas réparer une erreur de syntaxe : corrigez à la main.

## Autres messages fréquents {#autres}

| Message | Explication |
|---|---|
| `non-boolean condition in if statement` | `if n` au lieu de `if n != 0` |
| `cannot assign to s[0] (neither addressable nor a map index expression)` | les strings sont immuables |
| `cannot assign to struct field m["k"].X in map` | passer par une variable ou une map de pointeurs (voir [[maps#structs-dans-map]]) |
| `invalid operation: x (variable of type T) is not an interface` | assertion `x.(U)` sur un type non interface |
| `X does not implement Y (method M has pointer receiver)` | passer `&x` (voir [[faq-receiver-pointeur]]) |
| `import cycle not allowed` | deux packages s'importent mutuellement (voir [[packages#cycles]]) |
| `too many arguments` / `not enough arguments in call` | nombre d'arguments ou de valeurs de retour incorrect |
| `assignment mismatch: 1 variable but f returns 2 values` | récupérer toutes les valeurs : `v, err := f()` |
| `x declared and not used` dans un `for range` | utilisez `_` : `for _, v := range s` |
| `missing function body` / `unexpected {` | accolade mal placée ou parenthèse non fermée plus haut |

## Erreurs à l'exécution {#execution}

Si le programme compile mais s'arrête avec `panic: …`, ce n'est plus une erreur de compilation : voir [[panic-recover#panics-runtime]] et [[faq-deadlock]].
