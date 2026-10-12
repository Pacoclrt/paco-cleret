---
title: Aide-mémoire de la syntaxe Go
category: demarrer
order: 7
level: débutant
summary: Toute la syntaxe essentielle de Go sur une seule page, à garder sous la main.
aliases: aide-mémoire, cheatsheet, cheat sheet, mémo, résumé, syntaxe, récapitulatif, antisèche, référence rapide
related: variables, for, slices, maps, fonctions, interfaces
questions:
  - Où trouver un résumé de toute la syntaxe Go ?
  - Comment déclarer une variable, une slice, une map en Go ? -> variables-types
---

@@ rapide

Cette page condense la syntaxe de Go. Chaque bloc renvoie vers la page qui l'explique en détail.

```go
x := 42                          // variable (type déduit)
var s []int = []int{1, 2, 3}     // slice
m := map[string]int{"a": 1}      // map
for i, v := range s { }          // boucle
if v, ok := m["a"]; ok { }       // condition avec initialisation
func f(a, b int) (int, error) {} // fonction à deux retours
type P struct{ X, Y int }        // struct
func (p *P) Move() {}            // méthode
go f(1, 2)                       // goroutine
ch := make(chan int)             // channel
defer fichier.Close()            // exécution différée
```

@@ detail

## Variables et types {#variables-types}

```go
var a int            // valeur zéro : 0
var b = 3.14         // float64 déduit
c := "texte"         // déclaration courte (dans une fonction)
var d, e = 1, "deux" // multiple
const Max = 100      // constante

var (
	nom string
	age int
)
```

Types de base : `bool`, `string`, `int` `int8` `int16` `int32` `int64`, `uint`…, `float32` `float64`, `complex128`, `byte` (= `uint8`), `rune` (= `int32`). Voir [[variables]] et [[types-de-base]].

## Conversions {#conversions}

```go
f := float64(42)             // int → float64
n := int(3.99)               // 3 (troncature)
s := strconv.Itoa(42)        // int → "42"
i, err := strconv.Atoi("42") // "42" → int
b := []byte("salut")         // string → []byte
r := []rune("héllo")         // string → []rune
```

Voir [[conversions]].

## Conditions {#conditions}

```go
if x > 10 {
} else if x > 5 {
} else {
}

if err := faire(); err != nil {
	return err
}

switch jour {
case "samedi", "dimanche":
	fmt.Println("week-end")
default:
	fmt.Println("semaine")
}

switch { // switch sans expression = suite de if
case note >= 16:
case note >= 10:
}
```

## Boucles {#boucles}

```go
for i := 0; i < 10; i++ {
} // classique
for x < 100 {
} // « while »
for {
	break
} // infinie
for i := range 10 {
} // 0 à 9 (Go 1.22+)
for i, v := range slice {
} // index, valeur
for k, v := range m {
} // clé, valeur (ordre aléatoire)
for i, r := range "héllo" {
} // index d'octet, rune
for v := range ch {
} // jusqu'à la fermeture du channel
```

Voir [[for]].

## Slices et maps {#slices-maps}

```go
s := []int{1, 2, 3}
s = append(s, 4, 5)
t := s[1:3]             // [2 3] (partage la mémoire)
u := make([]int, 0, 10) // len 0, cap 10
n := copy(dst, src)
len(s)
cap(s)

m := map[string]int{}
m["a"] = 1
v, ok := m["b"] // ok == false si absente
delete(m, "a")
```

Voir [[slices]] et [[maps]].

## Fonctions {#fonctions}

```go
func somme(nums ...int) int { }            // variadique : somme(1, 2, 3)
func diviser(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division par zéro")
	}
	return a / b, nil
}

carre := func(x int) int { return x * x }  // fonction anonyme
```

Voir [[fonctions]] et [[closures]].

## Structs, méthodes, interfaces {#structs-interfaces}

```go
type Personne struct {
	Nom string
	Age int
}

p := Personne{Nom: "Ada", Age: 36}
ptr := &p
ptr.Age++                                  // déréférencement automatique

func (p Personne) Saluer() string { return "Salut " + p.Nom }
func (p *Personne) Vieillir()      { p.Age++ }

type Saluteur interface {
	Saluer() string
}
var s Saluteur = p                         // implémentation implicite

if pers, ok := s.(Personne); ok { }        // assertion de type
```

Voir [[structs]], [[methodes]] et [[interfaces]].

## Erreurs {#erreurs}

```go
if err != nil {
	return fmt.Errorf("lecture config : %w", err) // wrapping
}
errors.Is(err, os.ErrNotExist)
var pe *fs.PathError
errors.As(err, &pe)

defer func() {
	if r := recover(); r != nil {
	}
}()
```

Voir [[erreurs]] et [[panic-recover]].

## Concurrence {#concurrence}

```go
var wg sync.WaitGroup
wg.Add(1)
go func() {
	defer wg.Done()
	travail()
}()
wg.Wait()

ch := make(chan int, 3) // channel avec tampon
ch <- 1                 // envoi
v := <-ch               // réception
close(ch)

select {
case v := <-ch:
case <-time.After(time.Second):
case <-ctx.Done():
}

var mu sync.Mutex
mu.Lock()
defer mu.Unlock()
```

Voir [[goroutines]], [[channels]], [[select]] et [[sync]].

## Génériques {#generiques}

```go
func Max[T cmp.Ordered](a, b T) T {
	if a > b {
		return a
	}
	return b
}

type Pile[T any] struct{ elems []T }
```

Voir [[generiques]].

## Affichage avec fmt {#fmt}

| Verbe | Affiche |
|---|---|
| `%v` | valeur par défaut |
| `%+v` | struct avec noms des champs |
| `%T` | type |
| `%d` | entier |
| `%.2f` | flottant avec 2 décimales |
| `%s` / `%q` | chaîne / chaîne entre guillemets |
| `%c` | caractère (rune) |
| `%p` | pointeur |

Voir [[fmt]].
