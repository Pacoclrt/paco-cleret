---
title: Génériques (generics)
category: types
order: 3
level: avancé
summary: Depuis Go 1.18, fonctions et types peuvent avoir des paramètres de type : func Max[T cmp.Ordered](a, b T) T. Les contraintes (any, comparable, cmp.Ordered, unions avec ~) précisent les types acceptés.
aliases: générique, génériques, generics, generic, paramètre de type, type parameter, contrainte, constraint, any, comparable, cmp.ordered, ordered, ~int, tilde, union de types, template, templates, map filter reduce, pile générique, stack, type inference, inférence
related: interfaces, fonctions, slices, maps, types-personnalises
questions:
  - Comment écrire une fonction générique en Go ?
  - Qu'est-ce qu'une contrainte de type ? -> contraintes
  - Que signifie le ~ (tilde) dans une contrainte ? -> tilde
  - Comment créer un type générique (pile, liste) ? -> types-generiques
  - Quand utiliser les génériques plutôt que les interfaces ? -> quand
  - Comment écrire Map, Filter et Reduce en Go ? -> map-filter-reduce
---

@@ rapide

```go
// T est un paramètre de type, contraint par cmp.Ordered (types comparables avec <)
func Max[T cmp.Ordered](a, b T) T {
	if a > b {
		return a
	}
	return b
}

Max(3, 7)          // 7     (T = int, déduit)
Max("go", "rust")  // "rust" (T = string)
Max[float64](2, 3.5)

// Type générique
type Pile[T any] struct {
	elements []T
}

func (p *Pile[T]) Empiler(v T) { p.elements = append(p.elements, v) }
```

- Les paramètres de type s'écrivent entre **crochets** : `[T any]`, `[K comparable, V any]`.
- La **contrainte** (`any`, `comparable`, `cmp.Ordered`…) limite les types acceptés et définit les opérations autorisées.
- Le type est généralement **déduit** à l'appel.
- À utiliser quand le **même code** s'applique à plusieurs types (collections, algorithmes).

@@ detail

## Le problème résolu {#probleme}

Avant les génériques, pour sommer des `int` et des `float64`, il fallait dupliquer le code ou passer par `any` (sans vérification de type) :

```go
func SommeInts(s []int) int { … }
func SommeFloats(s []float64) float64 { … }
```

Avec les génériques, une seule fonction suffit, et le compilateur vérifie tout :

```go
type Nombre interface {
	~int | ~int64 | ~float64
}

func Somme[T Nombre](s []T) T {
	var total T
	for _, v := range s {
		total += v
	}
	return total
}

Somme([]int{1, 2, 3})       // 6
Somme([]float64{1.5, 2.5})  // 4
```

## Les fonctions génériques {#fonctions}

```go
func Inverser[T any](s []T) []T {
	res := make([]T, len(s))
	for i, v := range s {
		res[len(s)-1-i] = v
	}
	return res
}

Inverser([]int{1, 2, 3})        // [3 2 1]
Inverser([]string{"a", "b"})    // [b a]
```

Plusieurs paramètres de type :

```go
func Cles[K comparable, V any](m map[K]V) []K {
	res := make([]K, 0, len(m))
	for k := range m {
		res = append(res, k)
	}
	return res
}
```

## Les contraintes {#contraintes}

Une **contrainte** est une interface qui définit l'ensemble des types autorisés pour `T`, et donc ce qu'on a le droit de faire avec une valeur de type `T`.

| Contrainte | Types acceptés | Opérations permises |
|---|---|---|
| `any` | tous | affectation, passage en paramètre |
| `comparable` | types comparables | `==`, `!=` (clés de map) |
| `cmp.Ordered` | entiers, flottants, strings | `<`, `<=`, `>`, `>=`, `==` |
| interface avec méthodes | types ayant ces méthodes | appel des méthodes |
| union `int \| string` | les types listés | opérations communes à tous |

```go
func Contient[T comparable](s []T, cible T) bool {
	for _, v := range s {
		if v == cible { // == autorisé grâce à comparable
			return true
		}
	}
	return false
}

// Contrainte par méthode
func Joindre[T fmt.Stringer](elements []T, sep string) string {
	parts := make([]string, len(elements))
	for i, e := range elements {
		parts[i] = e.String()
	}
	return strings.Join(parts, sep)
}
```

## Le tilde ~ {#tilde}

`~int` signifie « tout type dont le **type sous-jacent** est `int` ». Sans le tilde, seul `int` lui-même est accepté :

```go
type Age int

type SansTilde interface{ int }
type AvecTilde interface{ ~int }

func A[T SansTilde](v T) {}
func B[T AvecTilde](v T) {}

A(Age(3)) // ❌ Age does not satisfy SansTilde
B(Age(3)) // ✅
```

Les contraintes de la bibliothèque standard (`cmp.Ordered`) utilisent le tilde pour accepter vos types personnalisés.

## Les types génériques {#types-generiques}

```go
// Pile générique (LIFO)
type Pile[T any] struct {
	elements []T
}

func (p *Pile[T]) Empiler(v T) {
	p.elements = append(p.elements, v)
}

func (p *Pile[T]) Depiler() (T, bool) {
	var zero T // valeur zéro de T, quel qu'il soit
	if len(p.elements) == 0 {
		return zero, false
	}
	dernier := p.elements[len(p.elements)-1]
	p.elements = p.elements[:len(p.elements)-1]
	return dernier, true
}

func (p *Pile[T]) Taille() int { return len(p.elements) }

var p Pile[string]
p.Empiler("a")
p.Empiler("b")
v, _ := p.Depiler() // "b"
```

Points notables :

- On instancie le type avec ses arguments : `Pile[string]`, `Pile[int]`.
- Dans les méthodes, on répète le paramètre : `func (p *Pile[T])`.
- `var zero T` est l'idiome pour obtenir la **valeur zéro** d'un type générique.

:::info Pas de paramètres de type sur les méthodes
Une méthode ne peut pas introduire ses **propres** paramètres de type : `func (p *Pile[T]) Map[U any](…)` est interdit. Écrivez une fonction : `func Map[T, U any](p *Pile[T], f func(T) U) *Pile[U]`.
:::

Autre exemple : une paire clé/valeur.

```go
type Paire[K comparable, V any] struct {
	Cle    K
	Valeur V
}

p := Paire[string, int]{"age", 36}
```

## Map, Filter, Reduce {#map-filter-reduce}

```go
func Map[T, U any](s []T, f func(T) U) []U {
	res := make([]U, len(s))
	for i, v := range s {
		res[i] = f(v)
	}
	return res
}

func Filter[T any](s []T, garder func(T) bool) []T {
	var res []T
	for _, v := range s {
		if garder(v) {
			res = append(res, v)
		}
	}
	return res
}

func Reduce[T, A any](s []T, init A, f func(A, T) A) A {
	acc := init
	for _, v := range s {
		acc = f(acc, v)
	}
	return acc
}

nombres := []int{1, 2, 3, 4, 5}
carres := Map(nombres, func(n int) int { return n * n })            // [1 4 9 16 25]
pairs := Filter(nombres, func(n int) bool { return n%2 == 0 })      // [2 4]
total := Reduce(nombres, 0, func(acc, n int) int { return acc + n }) // 15
textes := Map(nombres, strconv.Itoa)                                // ["1" "2" "3" "4" "5"]
```

## Les génériques de la bibliothèque standard {#standard}

Avant d'écrire votre propre fonction, regardez :

- **`slices`** : `Contains`, `Index`, `Sort`, `SortFunc`, `Max`, `Min`, `Reverse`, `Equal`, `Compact`, `Insert`, `Delete`…
- **`maps`** : `Keys`, `Values`, `Clone`, `Equal`, `DeleteFunc`…
- **`cmp`** : `Compare`, `Less`, `Or`, la contrainte `Ordered`.
- **`sync`** : `OnceValue`, `OnceValues`.
- Les fonctions intégrées **`min`** et **`max`** (Go 1.21+), génériques elles aussi.

## Inférence de type {#inference}

Le compilateur déduit `T` des arguments. Il faut l'indiquer explicitement quand il ne peut pas le deviner, par exemple si `T` n'apparaît que dans le type de retour :

```go
func Zero[T any]() T {
	var z T
	return z
}

x := Zero[int]()   // obligatoire : rien ne permet de déduire T
```

## Quand utiliser les génériques ? {#quand}

✅ **Oui** pour :

- les **structures de données** (pile, file, ensemble, arbre, cache) ;
- les **algorithmes** sur des slices et des maps (tri, recherche, filtrage) ;
- éviter du code dupliqué uniquement à cause du type.

❌ **Non** quand :

- une **interface** suffit : si vous appelez seulement des méthodes, `func Ecrire(w io.Writer)` est plus simple que `func Ecrire[W io.Writer](w W)` ;
- le comportement **diffère** selon le type (utilisez une interface ou un type switch) ;
- vous n'avez qu'**un seul** type concret aujourd'hui. Écrivez le code concret d'abord, généralisez quand le besoin apparaît.

## Alias de types génériques {#alias}

Depuis Go 1.24, un alias de type peut avoir des paramètres :

```go
type Ensemble[T comparable] = map[T]struct{}
```
