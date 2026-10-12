---
title: Comment faire de la POO et de l'héritage en Go ?
category: faq
order: 23
level: intermédiaire
summary: Go n'a ni classes ni héritage. On combine des structs (les données), des méthodes (le comportement), l'embedding (la réutilisation) et des interfaces (le polymorphisme). On parle de composition plutôt qu'héritage.
aliases: poo, programmation orientée objet, orienté objet, oop, classe, classes, héritage, hériter, inheritance, extends, super, sous-classe, classe abstraite, polymorphisme, encapsulation, constructeur, this, objet
related: structs, methodes, interfaces, embedding, types-personnalises
questions:
  - Go est-il un langage orienté objet ?
  - Comment remplacer une classe en Go ? -> correspondance
  - Comment faire du polymorphisme sans héritage ? -> polymorphisme
  - Comment faire l'équivalent de super() ? -> super
---

@@ rapide

| Concept de POO | En Go |
|---|---|
| Classe | `struct` + méthodes |
| Constructeur | fonction `NewXxx()` |
| Encapsulation (`private`) | nom en minuscule (privé au package) |
| Héritage de code | **embedding** (intégrer un type) |
| Polymorphisme / classe abstraite | **interface** |
| `this` / `self` | le receiver : `func (a *Animal) …` |

```go
type Animal interface{ Cri() string } // le comportement commun

type Chien struct{ Nom string }
type Chat struct{ Nom string }

func (c Chien) Cri() string { return c.Nom + " : Wouf" }
func (c Chat) Cri() string  { return c.Nom + " : Miaou" }

for _, a := range []Animal{Chien{"Rex"}, Chat{"Tom"}} {
	fmt.Println(a.Cri()) // polymorphisme, sans héritage
}
```

@@ detail

## Correspondance complète {#correspondance}

En Java :

```text
public abstract class Forme {
    protected String nom;
    public Forme(String nom) { this.nom = nom; }
    public abstract double aire();
    public String decrire() { return nom + " d'aire " + aire(); }
}
public class Cercle extends Forme { … }
```

En Go :

```go
// Le comportement attendu : une interface
type Forme interface {
	Aire() float64
	Nom() string
}

// Le code commun : une fonction qui accepte l'interface
func Decrire(f Forme) string {
	return fmt.Sprintf("%s d'aire %.2f", f.Nom(), f.Aire())
}

// Les types concrets
type Cercle struct{ Rayon float64 }

func NewCercle(r float64) *Cercle         { return &Cercle{Rayon: r} }
func (c *Cercle) Aire() float64           { return math.Pi * c.Rayon * c.Rayon }
func (c *Cercle) Nom() string             { return "cercle" }

type Rectangle struct{ L, H float64 }

func (r *Rectangle) Aire() float64 { return r.L * r.H }
func (r *Rectangle) Nom() string   { return "rectangle" }

formes := []Forme{NewCercle(1), &Rectangle{2, 3}}
for _, f := range formes {
	fmt.Println(Decrire(f))
}
// cercle d'aire 3.14
// rectangle d'aire 6.00
```

La « méthode de la classe abstraite » (`decrire`) devient une **fonction** qui prend l'interface. Plus besoin de hiérarchie.

## Réutiliser du code : l'embedding {#embedding}

```go
type Entite struct {
	ID       int
	CreeLe   time.Time
}

func (e *Entite) Age() time.Duration { return time.Since(e.CreeLe) }

type Utilisateur struct {
	Entite        // ID, CreeLe et Age() sont promus
	Email  string
}

type Commande struct {
	Entite
	Total float64
}

u := Utilisateur{Entite: Entite{ID: 1, CreeLe: time.Now()}, Email: "a@b.fr"}
fmt.Println(u.ID, u.Age())
```

`Utilisateur` et `Commande` réutilisent le code d'`Entite`, sans être des « sous-classes » : on ne peut pas passer un `Utilisateur` là où une `Entite` est attendue. Voir [[embedding]].

## Le polymorphisme {#polymorphisme}

En Go, le polymorphisme passe **uniquement** par les interfaces. Et comme l'implémentation est implicite, un type peut satisfaire des interfaces définies **après lui**, dans d'autres packages :

```go
type Sauvegardable interface {
	Sauver() error
}

func ToutSauver(elements ...Sauvegardable) error {
	for _, e := range elements {
		if err := e.Sauver(); err != nil {
			return err
		}
	}
	return nil
}
```

N'importe quel type avec une méthode `Sauver() error` peut être passé, sans rien déclarer.

## L'équivalent de super() {#super}

On appelle explicitement la méthode du type intégré :

```go
type Base struct{}

func (Base) Saluer() string { return "Bonjour" }

type Poli struct{ Base }

func (p Poli) Saluer() string {
	return p.Base.Saluer() + ", cher ami" // « super.saluer() »
}
```

Attention : il n'y a **pas de méthodes virtuelles**. Une méthode de `Base` qui appelle `Saluer()` appellera toujours `Base.Saluer`, jamais la version de `Poli` (voir [[embedding#pas-heritage]]).

## L'encapsulation {#encapsulation}

La visibilité se gère au niveau du **package**, pas du type :

```go
package banque

type Compte struct {
	titulaire string // privé : modifiable seulement dans le package banque
	solde     int
}

func (c *Compte) Solde() int { return c.solde }

func (c *Compte) Retirer(m int) error {
	if m > c.solde {
		return errors.New("solde insuffisant")
	}
	c.solde -= m
	return nil
}
```

## Pourquoi Go a fait ce choix {#pourquoi}

Les hiérarchies d'héritage profondes deviennent vite rigides : changer une classe parente casse des sous-classes lointaines, et on hérite souvent de comportements dont on n'a pas besoin. Go privilégie :

- des **petites interfaces** qui décrivent ce qu'on sait faire ;
- la **composition** de petits types simples ;
- un couplage faible entre packages.

Le principe « préférez la composition à l'héritage », recommandé dans de nombreux langages, est ici imposé par le langage lui-même.
