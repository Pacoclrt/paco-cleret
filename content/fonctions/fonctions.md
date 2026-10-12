---
title: Fonctions
category: fonctions
order: 1
level: débutant
summary: Une fonction se déclare avec func, peut prendre plusieurs paramètres et renvoyer plusieurs valeurs (souvent un résultat et une erreur). Les fonctions sont des valeurs comme les autres.
aliases: fonction, fonctions, func, function, paramètre, paramètres, argument, arguments, retour, return, valeur de retour, plusieurs valeurs de retour, retours multiples, résultats nommés, naked return, variadique, variadic, ..., fonction en paramètre, callback, type fonction, surcharge, paramètre par défaut, options
related: closures, methodes, erreurs, recursivite, defer, generiques
questions:
  - Comment déclarer une fonction en Go ?
  - Comment retourner plusieurs valeurs ? -> retours-multiples
  - Qu'est-ce qu'une fonction variadique (...) ? -> variadiques
  - Comment passer une fonction en paramètre ? -> fonctions-valeurs
  - Comment faire des paramètres par défaut ou optionnels ? -> parametres-optionnels
  - Que sont les résultats nommés ? -> resultats-nommes
---

@@ rapide

```go
// Paramètres typés, type de retour après les parenthèses
func additionner(a, b int) int {
	return a + b
}

// Plusieurs valeurs de retour : idiome (résultat, erreur)
func diviser(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division par zéro")
	}
	return a / b, nil
}

// Nombre variable d'arguments
func somme(nombres ...int) int {
	total := 0
	for _, n := range nombres {
		total += n
	}
	return total
}

res, err := diviser(10, 2)
fmt.Println(somme(1, 2, 3)) // 6
```

- Le **type vient après le nom** : `a int`, et `a, b int` regroupe des paramètres de même type.
- Les arguments sont **toujours copiés** (passage par valeur).
- Pas de surcharge ni de paramètres par défaut en Go.

@@ detail

## Déclaration {#declaration}

```go
func nom(param1 Type1, param2 Type2) TypeRetour {
	// corps
	return valeur
}
```

```go
func saluer(nom string) string {
	return "Bonjour " + nom
}

func afficher(msg string) { // pas de valeur de retour
	fmt.Println(msg)
}

func rectangle(l, h float64) float64 { // l et h sont tous deux float64
	return l * h
}
```

L'ordre de déclaration des fonctions dans un fichier n'a pas d'importance : `main` peut appeler une fonction définie plus bas.

## Retours multiples {#retours-multiples}

Une fonction peut renvoyer plusieurs valeurs. C'est la base de la gestion d'erreurs en Go :

```go
func chercher(id int) (Utilisateur, error) {
	u, ok := base[id]
	if !ok {
		return Utilisateur{}, fmt.Errorf("utilisateur %d introuvable", id)
	}
	return u, nil
}

u, err := chercher(42)
if err != nil {
	log.Fatal(err)
}
```

Autres usages courants :

```go
quotient, reste := divmod(17, 5)

func divmod(a, b int) (int, int) {
	return a / b, a % b
}

_, reste = divmod(20, 6) // ignorer une valeur avec _
```

Par convention, **l'erreur est toujours la dernière valeur** renvoyée, et un booléen `ok` indique souvent un succès (`v, ok := m[k]`).

## Résultats nommés {#resultats-nommes}

On peut nommer les valeurs de retour. Elles sont alors des variables initialisées à leur valeur zéro, et un `return` sans argument (*naked return*) les renvoie :

```go
func stats(nombres []float64) (mini, maxi, moyenne float64) {
	if len(nombres) == 0 {
		return // renvoie 0, 0, 0
	}
	mini, maxi = nombres[0], nombres[0]
	var total float64
	for _, n := range nombres {
		mini = min(mini, n)
		maxi = max(maxi, n)
		total += n
	}
	moyenne = total / float64(len(nombres))
	return
}
```

:::tip Bon usage
Les résultats nommés sont utiles pour **documenter** ce que renvoie une fonction (surtout quand plusieurs résultats ont le même type) et pour les modifier dans un `defer`. Évitez en revanche les `return` nus dans les longues fonctions : on ne voit plus ce qui est renvoyé.
:::

## Fonctions variadiques {#variadiques}

Le dernier paramètre peut être précédé de `...` : la fonction accepte alors **zéro ou plusieurs** arguments de ce type, reçus sous forme de **slice**.

```go
func moyenne(notes ...float64) float64 {
	if len(notes) == 0 {
		return 0
	}
	var total float64
	for _, n := range notes {
		total += n
	}
	return total / float64(len(notes))
}

moyenne()               // 0
moyenne(12, 15, 9)      // 12

liste := []float64{10, 20}
moyenne(liste...)       // déplier une slice existante avec ...
```

`fmt.Println(a ...any)` et `append(s []T, elems ...T)` sont des fonctions variadiques.

## Les fonctions sont des valeurs {#fonctions-valeurs}

On peut stocker une fonction dans une variable, la passer en argument ou la renvoyer :

```go
func appliquer(nombres []int, f func(int) int) []int {
	res := make([]int, len(nombres))
	for i, n := range nombres {
		res[i] = f(n)
	}
	return res
}

func carre(x int) int { return x * x }

fmt.Println(appliquer([]int{1, 2, 3}, carre))                            // [1 4 9]
fmt.Println(appliquer([]int{1, 2, 3}, func(x int) int { return x + 10 })) // [11 12 13]
```

On peut aussi définir un **type fonction** pour plus de lisibilité :

```go
type Operation func(a, b int) int

operations := map[string]Operation{
	"+": func(a, b int) int { return a + b },
	"-": func(a, b int) int { return a - b },
	"*": func(a, b int) int { return a * b },
}
fmt.Println(operations["*"](6, 7)) // 42
```

La valeur zéro d'une variable fonction est `nil` ; appeler une fonction nil provoque un `panic`. Voir aussi [[closures]].

## Passage par valeur {#passage-valeur}

Chaque argument est **copié** dans le paramètre. Pour qu'une fonction modifie une variable de l'appelant, on lui passe un pointeur :

```go
func reinitialiser(n *int) { *n = 0 }

x := 42
reinitialiser(&x) // x vaut 0
```

Voir [[pointeurs]].

## Paramètres optionnels et valeurs par défaut {#parametres-optionnels}

Go n'a ni surcharge (deux fonctions de même nom) ni paramètres par défaut. Trois alternatives idiomatiques :

**1. Des noms différents**

```go
func Ouvrir(nom string) (*Fichier, error)
func OuvrirAvecMode(nom string, mode int) (*Fichier, error)
```

**2. Une struct d'options** (sa valeur zéro sert de défaut)

```go
type Options struct {
	Timeout time.Duration
	Tentatives int
}

func Telecharger(url string, opts Options) error {
	if opts.Timeout == 0 {
		opts.Timeout = 10 * time.Second // valeur par défaut
	}
	// …
	return nil
}

Telecharger("https://go.dev", Options{Tentatives: 3})
```

**3. Les options fonctionnelles** (très répandues dans les bibliothèques)

```go
type Serveur struct {
	port    int
	verbeux bool
}

type Option func(*Serveur)

func AvecPort(p int) Option   { return func(s *Serveur) { s.port = p } }
func Verbeux() Option          { return func(s *Serveur) { s.verbeux = true } }

func NewServeur(opts ...Option) *Serveur {
	s := &Serveur{port: 8080} // valeurs par défaut
	for _, opt := range opts {
		opt(s)
	}
	return s
}

srv := NewServeur(AvecPort(9000), Verbeux())
```

## Fonctions spéciales {#speciales}

- `main()` : point d'entrée du programme (package `main`).
- `init()` : exécutée automatiquement avant `main` (voir [[packages#init]]).
- Les fonctions intégrées (*built-in*) : `len`, `cap`, `append`, `copy`, `delete`, `make`, `new`, `panic`, `recover`, `print`, `println`, `close`, `clear`, `min`, `max`, `complex`, `real`, `imag`.

## Bonnes pratiques {#bonnes-pratiques}

- Des fonctions **courtes**, qui font **une seule chose**.
- Au-delà de 4 ou 5 paramètres, regroupez-les dans une struct.
- Renvoyez une `error` plutôt que de faire `panic` pour les erreurs prévisibles.
- Le premier paramètre est un `context.Context` (nommé `ctx`) pour les fonctions qui font des E/S ou qui peuvent être annulées (voir [[context]]).
