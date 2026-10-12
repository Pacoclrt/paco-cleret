---
title: Interfaces
category: types
order: 1
level: intermédiaire
summary: Une interface décrit un comportement : une liste de méthodes. Un type l'implémente automatiquement dès qu'il possède ces méthodes, sans déclaration explicite. C'est la base du polymorphisme en Go.
aliases: interface, interfaces, polymorphisme, implémenter, implements, implémentation implicite, duck typing, contrat, abstraction, any, interface{}, interface vide, assertion de type, type assertion, type switch, .(type), io.reader, io.writer, stringer, error interface, nil interface
related: methodes, embedding, generiques, erreurs, faq-nil-interface, faq-heritage, switch
questions:
  - Qu'est-ce qu'une interface en Go ?
  - Comment implémenter une interface en Go ? -> implementation-implicite
  - Qu'est-ce que l'interface vide (any) ? -> any
  - Comment récupérer le type concret d'une interface ? -> assertion-de-type
  - Comment fonctionne un type switch ? -> type-switch
  - Comment vérifier qu'un type implémente une interface à la compilation ? -> verification
  - Quelles sont les interfaces les plus utilisées de la bibliothèque standard ? -> standard
---

@@ rapide

```go
// L'interface décrit CE QUE SAIT FAIRE un type
type Forme interface {
	Aire() float64
}

type Carre struct{ Cote float64 }
type Cercle struct{ Rayon float64 }

// Aucun « implements » : avoir la méthode suffit
func (c Carre) Aire() float64  { return c.Cote * c.Cote }
func (c Cercle) Aire() float64 { return math.Pi * c.Rayon * c.Rayon }

func AireTotale(formes ...Forme) float64 {
	total := 0.0
	for _, f := range formes {
		total += f.Aire() // polymorphisme
	}
	return total
}

fmt.Println(AireTotale(Carre{2}, Cercle{1})) // 7.14159…
```

- L'implémentation est **implicite** : un type satisfait une interface dès qu'il a toutes ses méthodes.
- Les interfaces Go sont **petites** (souvent une seule méthode) : `io.Reader`, `fmt.Stringer`, `error`.
- `any` (= `interface{}`) accepte n'importe quelle valeur ; on récupère le type avec `v.(T)` ou un **type switch**.

@@ detail

## Définir une interface {#definir}

Une interface est un type qui liste des **signatures de méthodes** :

```go
type Notifieur interface {
	Notifier(message string) error
}
```

Toute valeur dont le type possède une méthode `Notifier(string) error` peut être utilisée là où un `Notifieur` est attendu.

## L'implémentation implicite {#implementation-implicite}

```go
type Email struct{ Adresse string }
type SMS struct{ Numero string }

func (e Email) Notifier(msg string) error {
	fmt.Printf("Email à %s : %s\n", e.Adresse, msg)
	return nil
}

func (s SMS) Notifier(msg string) error {
	fmt.Printf("SMS au %s : %s\n", s.Numero, msg)
	return nil
}

func Alerter(n Notifieur, msg string) {
	if err := n.Notifier(msg); err != nil {
		log.Println("échec :", err)
	}
}

Alerter(Email{"ada@exemple.fr"}, "Serveur en panne")
Alerter(SMS{"0600000000"}, "Serveur en panne")
```

Ni `Email` ni `SMS` ne mentionnent `Notifieur`. Avantages :

- on peut définir une interface **après coup**, pour des types qu'on ne contrôle pas (ceux d'une bibliothèque) ;
- les packages restent **découplés** : celui qui *utilise* un comportement définit l'interface dont il a besoin.

## Accepter des interfaces, renvoyer des structs {#accepter-interfaces}

C'est un principe de conception central en Go :

```go
// ✅ accepte n'importe quelle source : fichier, réseau, chaîne, buffer…
func CompterLignes(r io.Reader) (int, error) {
	sc := bufio.NewScanner(r)
	n := 0
	for sc.Scan() {
		n++
	}
	return n, sc.Err()
}

CompterLignes(os.Stdin)
CompterLignes(strings.NewReader("a\nb\nc"))
f, _ := os.Open("log.txt")
CompterLignes(f)
```

Les paramètres en interface rendent la fonction **réutilisable et testable** (on lui passe un faux en test). Les valeurs de retour en type concret donnent à l'appelant **toutes** les méthodes disponibles.

## Petites interfaces et composition {#composition}

> Plus l'interface est grande, plus l'abstraction est faible. — Rob Pike

Les interfaces de la bibliothèque standard tiennent souvent en une méthode, et se **combinent** :

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}

type ReadWriter interface {
	Reader // intégration d'interfaces
	Writer
}
```

Par convention, une interface à une méthode porte le nom de la méthode suivi de `-er` : `Reader`, `Writer`, `Stringer`, `Closer`, `Formatter`.

## Les interfaces incontournables {#standard}

| Interface | Méthode(s) | Rôle |
|---|---|---|
| `error` | `Error() string` | représenter une erreur |
| `fmt.Stringer` | `String() string` | affichage personnalisé |
| `io.Reader` | `Read([]byte) (int, error)` | lire un flux d'octets |
| `io.Writer` | `Write([]byte) (int, error)` | écrire un flux d'octets |
| `io.Closer` | `Close() error` | libérer une ressource |
| `sort.Interface` | `Len`, `Less`, `Swap` | trier une collection |
| `http.Handler` | `ServeHTTP(ResponseWriter, *Request)` | traiter une requête HTTP |
| `json.Marshaler` | `MarshalJSON() ([]byte, error)` | JSON personnalisé |
| `context.Context` | `Deadline`, `Done`, `Err`, `Value` | annulation et délais |

## L'interface vide : any {#any}

`any` est un alias de `interface{}`, une interface **sans méthode** : tous les types la satisfont.

```go
var x any
x = 42
x = "texte"
x = []int{1, 2}

func Afficher(valeurs ...any) { // c'est la signature de fmt.Println
	for _, v := range valeurs {
		fmt.Printf("%v (%T)\n", v, v)
	}
}
```

:::warning Avec parcimonie
`any` fait perdre la vérification des types à la compilation. Préférez une interface précise ou les [[generiques]] quand c'est possible.
:::

## L'assertion de type {#assertion-de-type}

Pour récupérer la valeur concrète contenue dans une interface :

```go
var x any = "bonjour"

s := x.(string) // ok : s vaut "bonjour"
n := x.(int)    // ❌ panic: interface conversion: interface {} is string, not int

n, ok := x.(int) // forme sûre : ok == false, n == 0, pas de panic
if s, ok := x.(string); ok {
	fmt.Println(strings.ToUpper(s))
}
```

On peut aussi tester si une valeur implémente une **autre interface** :

```go
func Fermer(v any) {
	if c, ok := v.(io.Closer); ok {
		c.Close()
	}
}
```

## Le type switch {#type-switch}

Pour tester plusieurs types d'un coup :

```go
func Decrire(x any) string {
	switch v := x.(type) {
	case nil:
		return "rien"
	case int:
		return fmt.Sprintf("entier %d (le double vaut %d)", v, v*2)
	case string:
		return fmt.Sprintf("chaîne %q de %d octets", v, len(v))
	case fmt.Stringer:
		return "un Stringer : " + v.String()
	case error:
		return "une erreur : " + v.Error()
	default:
		return fmt.Sprintf("type %T non géré", v)
	}
}
```

Dans chaque branche à un seul type, `v` a **ce type**. Les branches sont testées dans l'ordre : placez les cas les plus précis en premier.

## Ce que contient une valeur d'interface {#valeur-interface}

Une valeur d'interface est une paire **(type dynamique, valeur dynamique)**. Elle n'est `nil` que si **les deux** sont nil.

```go
var p *MonErreur = nil
var err error = p
fmt.Println(p == nil)   // true
fmt.Println(err == nil) // false ! le type dynamique est *MonErreur
```

C'est le piège le plus célèbre de Go : voir [[faq-nil-interface]].

## Vérifier l'implémentation à la compilation {#verification}

L'implémentation étant implicite, on peut forcer une vérification avec une déclaration qui ne coûte rien :

```go
var _ Notifieur = Email{} // erreur de compilation si Email n'implémente pas Notifieur
var _ io.Writer = (*Journal)(nil)
```

## Polymorphisme sans héritage {#polymorphisme}

Les interfaces remplacent les classes abstraites et l'héritage des langages orientés objet. Un même code (`AireTotale`, `Alerter`, `CompterLignes`) fonctionne avec des types qui n'ont **aucun lien** entre eux, du moment qu'ils savent faire la même chose. Voir [[faq-heritage]].

## Interfaces et tests {#tests}

Dépendre d'une interface permet de remplacer une vraie implémentation (base de données, API externe) par un faux en test :

```go
type Stockage interface {
	Sauver(cle string, v []byte) error
}

type FauxStockage struct{ donnees map[string][]byte }

func (f *FauxStockage) Sauver(cle string, v []byte) error {
	f.donnees[cle] = v
	return nil
}
```

:::tip Définir l'interface côté consommateur
En Go, on déclare l'interface dans le package qui l'**utilise**, avec seulement les méthodes dont il a besoin, plutôt que dans le package qui l'implémente.
:::
