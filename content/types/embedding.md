---
title: Composition et embedding
category: types
order: 2
level: intermédiaire
summary: Go remplace l'héritage par la composition. En intégrant un type dans une struct (embedding), ses champs et méthodes sont « promus » et accessibles directement, sans créer de relation parent/enfant.
aliases: embedding, embed, intégration, intégrer, composition, héritage, hériter, inheritance, extends, champ anonyme, champ intégré, promotion, méthodes promues, surcharge de méthode, override, sous-classe, super
related: structs, interfaces, methodes, faq-heritage
questions:
  - Comment faire de l'héritage en Go ?
  - Qu'est-ce que l'embedding ? -> principe
  - Comment redéfinir une méthode d'un type intégré ? -> redefinir
  - Peut-on intégrer une interface dans une struct ? -> interface-dans-struct
  - Quelle différence entre embedding et héritage ? -> pas-heritage
---

@@ rapide

```go
type Animal struct {
	Nom string
}

func (a Animal) SePresenter() string { return "Je suis " + a.Nom }

type Chien struct {
	Animal          // champ intégré : pas de nom, juste le type
	Race   string
}

func (c Chien) Aboyer() string { return c.Nom + " : Wouf !" }

rex := Chien{Animal: Animal{Nom: "Rex"}, Race: "berger"}
fmt.Println(rex.Nom)           // champ promu (= rex.Animal.Nom)
fmt.Println(rex.SePresenter()) // méthode promue
fmt.Println(rex.Aboyer())
```

L'embedding **n'est pas de l'héritage** : un `Chien` n'est **pas** un `Animal` (on ne peut pas le passer à une fonction qui attend un `Animal`). Pour ce genre de polymorphisme, on utilise une [[interfaces|interface]].

@@ detail

## Le principe {#principe}

Un champ déclaré **sans nom**, avec seulement un type, est un **champ intégré** (*embedded field*). Le nom du champ est alors le nom du type :

```go
type Moteur struct {
	Puissance int
}

func (m *Moteur) Demarrer() { fmt.Println("vroum") }

type Voiture struct {
	Moteur        // champ intégré nommé implicitement « Moteur »
	Marque string
}

v := Voiture{Moteur: Moteur{Puissance: 110}, Marque: "Renault"}
v.Demarrer()                 // promu depuis Moteur
fmt.Println(v.Puissance)     // promu
fmt.Println(v.Moteur.Puissance) // accès explicite, toujours possible
```

Les champs et méthodes du type intégré sont **promus** : on y accède comme s'ils appartenaient à `Voiture`. C'est du « sucre syntaxique » : `v.Demarrer()` est réécrit en `v.Moteur.Demarrer()`.

## Redéfinir une méthode {#redefinir}

Si le type englobant déclare une méthode du même nom, elle **masque** celle du type intégré :

```go
type Base struct{}

func (Base) Decrire() string { return "base" }

type Derive struct {
	Base
}

func (d Derive) Decrire() string {
	return "dérivé, qui étend " + d.Base.Decrire() // appel explicite « au parent »
}

fmt.Println(Derive{}.Decrire()) // dérivé, qui étend base
```

Le **niveau le moins profond l'emporte**. Si deux types intégrés au même niveau fournissent le même nom, l'accès devient **ambigu** et ne compile pas tant qu'on ne précise pas lequel (`x.A.Nom`).

## Pas de l'héritage {#pas-heritage}

```go
func Presenter(a Animal) string { return a.SePresenter() }

Presenter(rex)        // ❌ cannot use rex (variable of type Chien) as Animal value
Presenter(rex.Animal) // ✅
```

Et surtout, **pas de liaison dynamique** : une méthode du type intégré ignore complètement les méthodes du type englobant.

```go
type Oiseau struct{}

func (o Oiseau) Cri() string      { return "cui" }
func (o Oiseau) Chanter() string  { return o.Cri() + " " + o.Cri() }

type Corbeau struct{ Oiseau }

func (c Corbeau) Cri() string { return "croa" }

fmt.Println(Corbeau{}.Chanter()) // cui cui  (et non croa croa)
```

`Chanter` est une méthode d'`Oiseau` : elle appelle `Oiseau.Cri`, toujours. En Java, on obtiendrait « croa croa ». Pour obtenir ce comportement en Go, on passe par une interface.

## Satisfaire une interface grâce à l'embedding {#interfaces}

Les méthodes promues comptent pour la satisfaction des interfaces :

```go
type Journaliseur struct{ Prefixe string }

func (j Journaliseur) Log(msg string) { fmt.Println(j.Prefixe, msg) }

type Service struct {
	Journaliseur
	Nom string
}

type Loggable interface{ Log(string) }

var l Loggable = Service{Journaliseur{"[svc]"}, "paiement"} // ✅ Service a Log via l'embedding
l.Log("démarré") // [svc] démarré
```

## Intégrer un pointeur {#pointeur}

On peut intégrer `*T` au lieu de `T`. Les méthodes à receiver pointeur deviennent alors disponibles même sur une valeur, et plusieurs structs peuvent partager la même instance intégrée. Attention : le pointeur vaut `nil` par défaut.

```go
type Requete struct {
	*http.Client
	URL string
}

r := Requete{Client: &http.Client{Timeout: 5 * time.Second}, URL: "https://go.dev"}
resp, err := r.Get(r.URL) // méthode Get de *http.Client, promue
```

## Intégrer un mutex {#mutex}

Un usage très courant (mais discuté) :

```go
type Compteur struct {
	sync.Mutex
	n int
}

func (c *Compteur) Inc() {
	c.Lock() // promu depuis sync.Mutex
	defer c.Unlock()
	c.n++
}
```

:::warning Méthodes exposées
L'embedding **exporte** les méthodes promues : ici, n'importe qui peut appeler `compteur.Lock()`. Pour garder le verrou privé, préférez un champ nommé : `mu sync.Mutex`.
:::

## Intégrer une interface dans une struct {#interface-dans-struct}

Une struct peut intégrer une **interface** : elle satisfait alors cette interface, et on peut ne redéfinir que certaines méthodes. Très pratique pour décorer un comportement ou créer des faux en test :

```go
type CompteurOctets struct {
	io.Writer     // n'importe quel Writer
	Total int
}

func (c *CompteurOctets) Write(p []byte) (int, error) {
	n, err := c.Writer.Write(p) // délègue au Writer intégré
	c.Total += n
	return n, err
}

c := &CompteurOctets{Writer: os.Stdout}
fmt.Fprintln(c, "bonjour")
fmt.Println(c.Total) // 8
```

## Intégrer des interfaces dans des interfaces {#interface-dans-interface}

```go
type ReadCloser interface {
	io.Reader
	io.Closer
}
```

L'ensemble des méthodes est l'union des interfaces intégrées. C'est ainsi que sont construites `io.ReadWriter`, `io.ReadWriteCloser`, etc.

## Composition plutôt qu'héritage {#composition}

| Besoin en POO classique | En Go |
|---|---|
| Réutiliser du code d'une classe parente | Intégrer un type (embedding) ou simplement avoir un champ |
| Polymorphisme (traiter des types différents pareil) | Interfaces |
| Classe abstraite | Interface + fonctions utilitaires |
| Redéfinir une méthode | Déclarer la méthode sur le type englobant |
| `super.methode()` | `x.TypeIntegre.Methode()` |

Voir [[faq-heritage]] pour un exemple complet.
