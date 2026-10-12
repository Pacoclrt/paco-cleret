---
title: Méthodes
category: fonctions
order: 3
level: intermédiaire
summary: Une méthode est une fonction attachée à un type via un receiver : func (p Personne) Saluer(). Avec un receiver pointeur (p *Personne), la méthode peut modifier la valeur.
aliases: méthode, méthodes, method, methods, receiver, récepteur, receveur, receiver pointeur, receiver valeur, this, self, method set, ensemble de méthodes, method value, method expression, getter, setter
related: structs, pointeurs, interfaces, embedding, faq-receiver-pointeur, types-personnalises
questions:
  - Qu'est-ce qu'une méthode en Go ?
  - Quelle différence entre receiver valeur et receiver pointeur ? -> valeur-pointeur
  - Peut-on ajouter une méthode à un type int ou string ? -> types-autorises
  - Qu'est-ce que l'ensemble de méthodes (method set) ? -> method-set
  - Faut-il écrire des getters et setters en Go ? -> getters
---

@@ rapide

```go
type Rectangle struct {
	Largeur, Hauteur float64
}

// Receiver VALEUR : travaille sur une copie, lecture seule
func (r Rectangle) Aire() float64 {
	return r.Largeur * r.Hauteur
}

// Receiver POINTEUR : peut modifier la valeur
func (r *Rectangle) Agrandir(facteur float64) {
	r.Largeur *= facteur
	r.Hauteur *= facteur
}

rect := Rectangle{2, 3}
rect.Agrandir(2)          // Go prend automatiquement &rect
fmt.Println(rect.Aire())  // 24
```

- Le **receiver** (`r`) est l'équivalent de `this` ou `self`, mais avec un nom court explicite.
- Receiver **pointeur** si la méthode modifie la valeur ou si la struct est grosse ; sinon receiver valeur.
- Restez **cohérent** : si une méthode du type a un receiver pointeur, mettez-en un partout.

@@ detail

## Déclarer une méthode {#declarer}

Une méthode est une fonction avec un paramètre spécial placé **avant** son nom, le **receiver** :

```go
type Personne struct {
	Prenom, Nom string
}

func (p Personne) NomComplet() string {
	return p.Prenom + " " + p.Nom
}

ada := Personne{"Ada", "Lovelace"}
fmt.Println(ada.NomComplet()) // Ada Lovelace
```

Conventions : le receiver porte un nom **court** (une ou deux lettres, souvent l'initiale du type), jamais `this` ou `self`, et le même nom dans toutes les méthodes du type.

## Receiver valeur ou pointeur {#valeur-pointeur}

```go
type Compteur struct{ n int }

func (c Compteur) IncrementerCopie() { c.n++ } // modifie une copie : sans effet
func (c *Compteur) Incrementer()     { c.n++ } // modifie l'original

c := Compteur{}
c.IncrementerCopie()
c.Incrementer()
fmt.Println(c.n) // 1
```

| Receiver pointeur `(c *T)` si… | Receiver valeur `(c T)` si… |
|---|---|
| la méthode **modifie** le receiver | le type est petit et immuable (`time.Time`, `Point`) |
| la struct est **grosse** | le type est une map, une fonction ou un channel |
| la struct contient un `sync.Mutex` ou ne doit pas être copiée | le type est une petite slice qu'on ne réaffecte pas |
| **dans le doute** | |

Mélanger les deux sur un même type est déconseillé : choisissez une convention par type. Plus de détails dans [[faq-receiver-pointeur]].

## Appel automatique avec & ou * {#appel-automatique}

Go ajuste automatiquement le receiver :

```go
c := Compteur{} // une valeur adressable
c.Incrementer() // devient (&c).Incrementer()

p := &Compteur{}
p.IncrementerCopie() // devient (*p).IncrementerCopie()
```

Exception : une valeur **non adressable** (une valeur de map, le résultat d'une fonction) ne peut pas appeler une méthode à receiver pointeur :

```go
m := map[string]Compteur{"a": {}}
m["a"].Incrementer() // ❌ cannot call pointer method Incrementer on Compteur
```

## Sur quels types ? {#types-autorises}

On peut déclarer des méthodes sur **n'importe quel type nommé défini dans le même package** : struct, mais aussi `int`, `string`, slice, map, fonction…

```go
type Celsius float64

func (c Celsius) EnFahrenheit() float64 {
	return float64(c)*9/5 + 32
}

type Liste []string

func (l Liste) Contient(s string) bool {
	return slices.Contains(l, s)
}

fmt.Println(Celsius(100).EnFahrenheit())        // 212
fmt.Println(Liste{"a", "b"}.Contient("b"))      // true
```

On **ne peut pas** ajouter de méthode à un type d'un autre package (ni à `int` ou `string` directement). La solution : définir son propre type basé dessus, comme `Celsius` ci-dessus. Voir [[types-personnalises]].

## Les méthodes et les interfaces {#method-set}

Un type **implémente** une interface s'il possède toutes ses méthodes. Le type du receiver compte :

| Méthodes déclarées avec… | Disponibles pour une valeur `T` | Disponibles pour un pointeur `*T` |
|---|---|---|
| receiver valeur `(t T)` | ✅ | ✅ |
| receiver pointeur `(t *T)` | ❌ | ✅ |

```go
type Incrementeur interface{ Incrementer() }

var i Incrementeur
i = &Compteur{} // ✅ *Compteur possède Incrementer
i = Compteur{}  // ❌ Compteur does not implement Incrementeur (method Incrementer has pointer receiver)
```

Logique : une interface peut contenir une **copie** de la valeur ; modifier cette copie n'aurait pas de sens. Voir [[interfaces]].

## Méthodes sur un receiver nil {#receiver-nil}

Une méthode à receiver pointeur peut être appelée sur un pointeur `nil`. C'est parfois utilisé volontairement :

```go
type Arbre struct {
	Valeur        int
	Gauche, Droit *Arbre
}

func (a *Arbre) Somme() int {
	if a == nil {
		return 0 // un arbre vide a une somme nulle
	}
	return a.Valeur + a.Gauche.Somme() + a.Droit.Somme()
}
```

## Valeurs et expressions de méthode {#method-values}

Une méthode peut être utilisée comme une valeur fonction :

```go
c := &Compteur{}
inc := c.Incrementer // « method value » : liée à c
inc()
inc()
fmt.Println(c.n) // 2

f := (*Compteur).Incrementer // « method expression » : le receiver devient 1er paramètre
f(c)
```

Pratique pour passer une méthode comme callback : `http.HandleFunc("/", srv.handleAccueil)`.

## Getters et setters {#getters}

Go n'encourage pas les getters/setters systématiques. Exportez simplement le champ s'il n'y a pas de logique. S'il en faut un, la convention est :

- getter : `Proprietaire()` (et **pas** `GetProprietaire()`) ;
- setter : `SetProprietaire(p string)`.

```go
type Compte struct{ solde int }

func (c *Compte) Solde() int { return c.solde }
func (c *Compte) Deposer(m int) error {
	if m <= 0 {
		return errors.New("montant invalide")
	}
	c.solde += m
	return nil
}
```

## La méthode String {#string}

Implémenter `String() string` rend un type joliment affichable par `fmt` (interface `fmt.Stringer`) :

```go
func (p Personne) String() string {
	return p.Prenom + " " + strings.ToUpper(p.Nom)
}

fmt.Println(ada) // Ada LOVELACE
```
