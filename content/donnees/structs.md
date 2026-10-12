---
title: Structures (struct)
category: donnees
order: 4
level: débutant
summary: Une struct regroupe des champs nommés de types différents (type Personne struct { Nom string; Age int }). C'est la brique de base pour modéliser des données en Go, à la place des classes.
aliases: struct, structs, structure, structures, objet, objets, classe, classes, champ, champs, attribut, propriété, constructeur, new, tag, tags, struct tag, struct anonyme, struct vide, struct{}, modèle de données, record
related: methodes, pointeurs, embedding, interfaces, json, faq-heritage
questions:
  - Qu'est-ce qu'une struct en Go ?
  - Comment créer un objet (une instance de struct) ? -> creer
  - Comment écrire un constructeur en Go ? -> constructeur
  - Faut-il passer une struct par valeur ou par pointeur ? -> valeur-ou-pointeur
  - À quoi servent les tags de struct (json:"nom") ? -> tags
  - Qu'est-ce qu'une struct anonyme ? -> anonymes
  - Comment comparer deux structs ? -> comparer
---

@@ rapide

```go
type Personne struct {
	Nom   string
	Age   int
	Email string
}

p1 := Personne{Nom: "Ada", Age: 36}    // champs nommés (recommandé), Email vaut ""
p2 := Personne{"Linus", 54, "l@x.org"} // par position (fragile)
var p3 Personne                        // tous les champs à leur valeur zéro

p1.Age++ // accès avec le point
ptr := &p1
ptr.Nom = "Ada L." // déréférencement automatique

fmt.Printf("%+v\n", p1) // {Nom:Ada L. Age:37 Email:}
```

- Une struct est une **valeur** : l'affecter ou la passer à une fonction la **copie**.
- Les champs en **Majuscule** sont exportés (visibles hors du package et par `encoding/json`).
- On lui ajoute du comportement avec des [[methodes]] ; Go n'a **pas de classes**.

@@ detail

## Déclarer un type struct {#declarer}

```go
type Produit struct {
	ID      int
	Nom     string
	Prix    float64
	Tags    []string
	EnStock bool
	creeLe  time.Time // privé au package
}
```

Des champs de même type peuvent être regroupés : `X, Y, Z float64`.

## Créer une valeur {#creer}

```go
// 1. Littéral avec champs nommés : clair et robuste
p := Produit{Nom: "Clavier", Prix: 49.9}

// 2. Littéral positionnel : tous les champs, dans l'ordre (à éviter hors des tout petits types)
type Point struct{ X, Y int }
pt := Point{3, 4}

// 3. Valeur zéro
var vide Produit // {0 "" 0 [] false {}}

// 4. Pointeur vers une nouvelle struct
pp := &Produit{Nom: "Souris"}
pz := new(Produit) // équivalent à &Produit{}
```

Avec les champs nommés, ajouter un champ au type ne casse aucun code existant. C'est pourquoi `go vet` signale les littéraux positionnels de types d'autres packages.

## Accéder aux champs {#acces}

```go
p.Prix = 39.9
fmt.Println(p.Nom)

ptr := &p
ptr.Prix = 29.9 // équivaut à (*ptr).Prix : Go déréférence automatiquement
```

## Valeur ou pointeur ? {#valeur-ou-pointeur}

Une struct est **copiée** à chaque affectation et passage de paramètre :

```go
func solder(p Produit) {
	p.Prix *= 0.8 // modifie la copie
}

func solderVraiment(p *Produit) {
	p.Prix *= 0.8 // modifie l'original
}

clavier := Produit{Prix: 50}
solder(clavier)
fmt.Println(clavier.Prix) // 50
solderVraiment(&clavier)
fmt.Println(clavier.Prix) // 40
```

| Utilisez un pointeur `*T` quand… | Utilisez une valeur `T` quand… |
|---|---|
| la fonction doit **modifier** la struct | la struct est petite et non modifiée |
| la struct est **grosse** (copie coûteuse) | on veut une copie indépendante, sans effet de bord |
| la struct contient un `sync.Mutex` (ne doit pas être copié) | le type représente une valeur simple (`Point`, `Couleur`, `time.Time`) |
| on veut pouvoir représenter « absent » avec `nil` | |

## Constructeurs {#constructeur}

Go n'a pas de constructeur intégré. Par convention, on écrit une fonction `NewNomDuType` qui initialise et valide :

```go
type Compte struct {
	titulaire  string
	solde      int
	historique []int
}

// NewCompte crée un compte avec un solde initial.
func NewCompte(titulaire string, depot int) (*Compte, error) {
	if titulaire == "" {
		return nil, errors.New("titulaire obligatoire")
	}
	return &Compte{
		titulaire:  titulaire,
		solde:      depot,
		historique: []int{depot},
	}, nil
}
```

Si le package ne contient qu'un type principal, on l'appelle simplement `New` (ex. `list.New()`).

:::tip Une valeur zéro utile
Quand c'est possible, concevez vos types pour que la valeur zéro soit directement utilisable (comme `bytes.Buffer` ou `sync.Mutex`). Le constructeur devient alors optionnel.
:::

## Afficher une struct {#afficher}

```go
p := Point{3, 4}
fmt.Println(p)         // {3 4}
fmt.Printf("%+v\n", p) // {X:3 Y:4}
fmt.Printf("%#v\n", p) // main.Point{X:3, Y:4}
```

Ajoutez une méthode `String() string` pour personnaliser l'affichage (voir [[fmt#stringer]]).

## Comparer des structs {#comparer}

Deux structs sont comparables avec `==` si **tous leurs champs** sont comparables. La comparaison se fait champ par champ :

```go
a := Point{1, 2}
b := Point{1, 2}
fmt.Println(a == b) // true
```

Une struct qui contient une slice, une map ou une fonction n'est **pas** comparable avec `==` (erreur de compilation). Écrivez alors une méthode `Equal`, ou utilisez `reflect.DeepEqual` dans les tests.

## Les tags {#tags}

Un **tag** est une chaîne attachée à un champ, lue à l'exécution par réflexion. Il configure des bibliothèques comme `encoding/json`, les ORM ou les validateurs :

```go
type Utilisateur struct {
	ID         int    `json:"id"`
	Nom        string `json:"nom"`
	Email      string `json:"email,omitempty"` // omis s'il est vide
	MotDePasse string `json:"-"`               // jamais sérialisé
}
```

Le format conventionnel est `clé:"valeur"`, séparés par des espaces : `` `json:"nom" db:"nom_complet"` ``. Voir [[json]].

## Structs anonymes {#anonymes}

On peut déclarer une struct sans lui donner de nom, pour un usage ponctuel :

```go
config := struct {
	Hote string
	Port int
}{"localhost", 8080}

// Très utilisé dans les tests « table-driven »
tests := []struct {
	entree  string
	attendu int
}{
	{"1", 1},
	{"42", 42},
}
```

## La struct vide {#struct-vide}

`struct{}` ne contient aucun champ et **n'occupe aucun octet**. On l'utilise pour les ensembles (`map[string]struct{}`) et les signaux sur les channels (`chan struct{}`).

## Composition plutôt qu'héritage {#composition}

Pour réutiliser des champs et méthodes d'un autre type, on l'**intègre** (embedding) :

```go
type Animal struct{ Nom string }
func (a Animal) Presenter() string { return "Je suis " + a.Nom }

type Chien struct {
	Animal        // champ intégré : ses champs et méthodes sont promus
	Race   string
}

c := Chien{Animal{"Rex"}, "berger"}
fmt.Println(c.Nom, c.Presenter()) // Rex Je suis Rex
```

Voir [[embedding]] et [[faq-heritage]].
