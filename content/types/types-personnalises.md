---
title: Types personnalisés et alias
category: types
order: 4
level: intermédiaire
summary: « type Celsius float64 » crée un nouveau type distinct, sur lequel on peut ajouter des méthodes. « type A = B » crée seulement un alias (un autre nom pour le même type).
aliases: type, types personnalisés, type défini, defined type, alias, alias de type, type alias, type sous-jacent, underlying type, nouveau type, énumération, enum, type fonction, handlerfunc, sécurité de type
related: constantes, methodes, conversions, structs, generiques
questions:
  - Comment créer son propre type en Go ?
  - Quelle différence entre type A B et type A = B ? -> alias
  - Pourquoi créer un type Celsius au lieu d'utiliser float64 ? -> pourquoi
  - Comment créer une énumération ? -> enum
  - Comment ajouter une méthode à un type fonction ? -> types-fonction
---

@@ rapide

```go
type Celsius float64        // NOUVEAU type, basé sur float64
type Fahrenheit float64

func (c Celsius) EnFahrenheit() Fahrenheit {
	return Fahrenheit(c*9/5 + 32)
}

var t Celsius = 20
f := t.EnFahrenheit()       // 68
// var x Celsius = f        // ❌ types différents : protection contre les erreurs

type Octet = byte           // ALIAS : exactement le même type que byte
```

- **Type défini** (`type A B`) : nouveau type, conversions explicites obligatoires, peut avoir ses propres méthodes.
- **Alias** (`type A = B`) : simple autre nom, totalement interchangeable.
- Les types définis apportent **sécurité** (on ne mélange pas des Celsius et des Fahrenheit) et **comportement** (méthodes).

@@ detail

## Les types définis {#types-definis}

```go
type IDUtilisateur int
type Email string
type Matrice [][]float64
type Annuaire map[string]string
```

Chaque déclaration crée un type **distinct** de son **type sous-jacent** :

```go
var id IDUtilisateur = 42
var n int = 42
fmt.Println(id == n)      // ❌ mismatched types IDUtilisateur and int
fmt.Println(int(id) == n) // ✅ conversion explicite
```

Le nouveau type hérite des **opérations** de son type sous-jacent (`+` sur un type basé sur `int`, indexation sur un type basé sur une slice…), mais **pas de ses méthodes**.

## Pourquoi créer ses types ? {#pourquoi}

**1. La sécurité** : le compilateur empêche les confusions.

```go
type Metres float64
type Secondes float64

func Vitesse(d Metres, t Secondes) float64 { return float64(d) / float64(t) }

d, t := Metres(100), Secondes(9.58)
Vitesse(d, t) // ✅
Vitesse(t, d) // ❌ cannot use t (variable of type Secondes) as Metres value
```

**2. Les méthodes** : on donne un comportement au type.

```go
type Email string

func (e Email) Domaine() string {
	_, domaine, _ := strings.Cut(string(e), "@")
	return domaine
}

fmt.Println(Email("ada@exemple.fr").Domaine()) // exemple.fr
```

**3. La lisibilité** : `func Envoyer(to Email)` documente mieux que `func Envoyer(to string)`.

## Les énumérations {#enum}

Type défini + constantes + `iota` = énumération :

```go
type Statut int

const (
	EnAttente Statut = iota
	EnCours
	Termine
	Annule
)

func (s Statut) String() string {
	return [...]string{"en attente", "en cours", "terminé", "annulé"}[s]
}

func (s Statut) EstFinal() bool { return s == Termine || s == Annule }

s := EnCours
fmt.Println(s, s.EstFinal()) // en cours false
```

:::warning Valeurs hors limites
`Statut(10).String()` provoque un panic (indice hors du tableau). Une version robuste vérifie les bornes ou utilise un `switch` avec un `default`. Voir [[constantes#enumerations]].
:::

## Les alias {#alias}

```go
type Octet = byte
type Texte = string
```

Un alias n'est **pas** un nouveau type : `Octet` et `byte` sont strictement identiques et interchangeables, sans conversion. On ne peut pas ajouter de méthodes à un alias d'un type d'un autre package.

À quoi servent-ils ?

- `byte` est un alias de `uint8`, `rune` un alias de `int32`, `any` un alias de `interface{}`.
- Faciliter le **déplacement** d'un type d'un package à un autre lors d'un refactoring, sans casser le code existant.
- Raccourcir un type complexe : `type Ensemble[T comparable] = map[T]struct{}` (alias générique, Go 1.24+).

| | `type A B` (défini) | `type A = B` (alias) |
|---|---|---|
| Nouveau type | oui | non |
| Conversion nécessaire | oui | non |
| Méthodes propres | oui | non (ce sont celles de B) |
| `%T` affiche | `main.A` | le nom de B |

## Types fonction {#types-fonction}

Un type défini peut être basé sur une signature de fonction, et avoir des méthodes. C'est un motif célèbre de `net/http` :

```go
// Dans net/http :
type HandlerFunc func(ResponseWriter, *Request)

func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
	f(w, r)
}
```

Grâce à cette méthode, **n'importe quelle fonction** de la bonne signature devient un `http.Handler` par simple conversion : `http.HandlerFunc(maFonction)`.

Même idée pour un validateur :

```go
type Regle func(string) error

func (r Regle) Et(autre Regle) Regle {
	return func(s string) error {
		if err := r(s); err != nil {
			return err
		}
		return autre(s)
	}
}

nonVide := Regle(func(s string) error {
	if s == "" {
		return errors.New("vide")
	}
	return nil
})
court := Regle(func(s string) error {
	if len(s) > 10 {
		return errors.New("trop long")
	}
	return nil
})

valider := nonVide.Et(court)
fmt.Println(valider("")) // vide
```

## Types basés sur des structs {#structs}

`type Point struct{ X, Y int }` est aussi un type défini, dont le type sous-jacent est une struct anonyme. On peut convertir entre deux types structs **identiques** (mêmes champs, mêmes types, dans le même ordre ; les tags sont ignorés) :

```go
type PointAPI struct {
	X int `json:"x"`
	Y int `json:"y"`
}

p := Point{1, 2}
api := PointAPI(p) // conversion autorisée
```

## Les méthodes ne se transmettent pas {#methodes}

```go
type MonTemps time.Time

var t MonTemps
t.Format("2006") // ❌ MonTemps n'a pas les méthodes de time.Time
```

Pour **garder** les méthodes du type d'origine tout en ajoutant les siennes, utilisez l'embedding : `type MonTemps struct{ time.Time }`. Voir [[embedding]].
