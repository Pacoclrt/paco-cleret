---
title: Constantes et iota
category: bases
order: 2
level: débutant
summary: Une constante (const) est une valeur fixée à la compilation. iota génère des suites de valeurs, idéal pour créer des énumérations.
aliases: const, constante, constantes, iota, enum, énumération, enumeration, enumérer, valeurs fixes, constante typée, constante non typée, untyped
related: variables, types-personnalises, types-de-base
questions:
  - Comment déclarer une constante en Go ?
  - Comment faire un enum en Go ? -> enumerations
  - À quoi sert iota ? -> iota
  - Qu'est-ce qu'une constante non typée ? -> non-typees
---

@@ rapide

```go
const Pi = 3.14159
const Salutation = "Bonjour"

const (
	Lundi    = iota // 0
	Mardi           // 1
	Mercredi        // 2
)
```

- Une constante est **calculée à la compilation** et ne peut jamais changer.
- Seuls les nombres, les chaînes, les booléens (et les runes) peuvent être constants : **pas** de slice, map ou struct constante.
- **`iota`** vaut 0 sur la première ligne d'un bloc `const`, puis augmente de 1 à chaque ligne. C'est la façon de faire des **énumérations** en Go.

@@ detail

## Déclarer des constantes {#declarer}

```go
const MaxConnexions = 100
const Version string = "1.4.2" // type explicite (optionnel)

const (
	Hote = "localhost"
	Port = 8080
)
```

Une constante peut être déclarée au niveau du package ou dans une fonction. Sa valeur doit être **connue à la compilation** :

```go
const a = 2 * 60 * 60    // ok : calcul constant
const b = len("bonjour") // ok : len d'une chaîne constante
const c = math.Sqrt(2)   // ❌ appel de fonction : pas constant
const d = time.Now()     // ❌
```

## Constantes non typées {#non-typees}

Une constante déclarée **sans type** est « non typée ». Elle a une **précision arbitraire** et s'adapte au type attendu au moment où on l'utilise :

```go
const Grand = 1 << 100    // n'entre dans aucun int, mais c'est permis…
const Petit = Grand >> 99 // … car on peut la ramener à 2

var f float64 = Petit // 2 devient float64
var i int = Petit     // 2 devient int
```

C'est pour cela qu'on peut écrire `time.Sleep(2 * time.Second)` : le `2` non typé devient un `time.Duration`. En revanche, avec une **variable** `n := 2`, il faut convertir : `time.Duration(n) * time.Second`.

## iota {#iota}

`iota` est un compteur spécial, valable uniquement dans un bloc `const` : il vaut **0** sur la première ligne, **1** sur la suivante, etc. Une ligne sans expression **répète** l'expression précédente (avec le nouvel `iota`).

```go
const (
	A = iota // 0
	B        // 1
	C        // 2
)

const (
	_  = iota             // 0 ignoré
	KB = 1 << (10 * iota) // 1 << 10 = 1024
	MB                    // 1 << 20
	GB                    // 1 << 30
)
```

On peut décaler le départ, sauter des valeurs ou faire des calculs :

```go
const (
	Bas   = iota + 1 // 1
	Moyen            // 2
	_                // 3 sauté
	Haut             // 4
)
```

## Les énumérations {#enumerations}

Go n'a pas de mot-clé `enum`. On combine un **type personnalisé** et `iota` :

```go
type Couleur int

const (
	Rouge Couleur = iota
	Vert
	Bleu
)

// String rend la couleur lisible avec fmt.Println.
func (c Couleur) String() string {
	switch c {
	case Rouge:
		return "rouge"
	case Vert:
		return "vert"
	case Bleu:
		return "bleu"
	}
	return fmt.Sprintf("Couleur(%d)", int(c))
}

func main() {
	c := Vert
	fmt.Println(c)        // vert (grâce à String)
	fmt.Printf("%d\n", c) // 1
}
```

Le type `Couleur` empêche de passer n'importe quel `int` par erreur à une fonction qui attend une couleur (sauf une constante non typée, qui reste convertie automatiquement).

:::tip Générer String automatiquement
L'outil `stringer` (`go install golang.org/x/tools/cmd/stringer@latest`) génère la méthode `String()` pour vous, avec une directive `//go:generate stringer -type=Couleur`.
:::

:::warning Commencer à 1 ?
Avec `iota` démarrant à 0, la **valeur zéro** du type correspond à la première constante. Si « non défini » doit être distinguable, commencez par une valeur `Inconnu` ou utilisez `iota + 1`.
:::

## Drapeaux binaires (bit flags) {#bit-flags}

Avec `1 << iota`, chaque constante occupe un bit différent : on peut les **combiner** avec `|`.

```go
type Permission uint8

const (
	Lecture   Permission = 1 << iota // 1   (001)
	Ecriture                         // 2   (010)
	Execution                        // 4   (100)
)

p := Lecture | Ecriture
fmt.Println(p&Ecriture != 0)  // true : le droit d'écriture est présent
fmt.Println(p&Execution != 0) // false
```

## Ce qui ne peut pas être constant {#limites}

Les slices, maps, structs, pointeurs et résultats de fonction ne peuvent pas être `const`. Pour une valeur « fixe » de ce genre, on utilise une variable de package (par convention non modifiée), ou une fonction qui la renvoie :

```go
var joursOuvres = []string{"lun", "mar", "mer", "jeu", "ven"}

func JoursOuvres() []string {
	return []string{"lun", "mar", "mer", "jeu", "ven"} // copie neuve à chaque appel
}
```
