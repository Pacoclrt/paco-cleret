---
title: Pointeurs
category: donnees
order: 5
level: débutant
summary: Un pointeur (*T) contient l'adresse d'une variable. &x donne l'adresse de x, *p la valeur pointée. On s'en sert pour modifier une variable depuis une fonction ou éviter de copier de grosses structures.
aliases: pointeur, pointeurs, pointer, adresse, référence, &, *, déréférencer, déréférencement, nil pointer, nil pointer dereference, invalid memory address, new, passage par référence, passage par valeur, *int
related: structs, methodes, fonctions, faq-make-new, faq-receiver-pointeur, memoire-performance
questions:
  - Qu'est-ce qu'un pointeur en Go ?
  - Que signifient & et * en Go ? -> bases
  - Comment modifier une variable dans une fonction ? -> modifier-fonction
  - Pourquoi « invalid memory address or nil pointer dereference » ? -> nil
  - Peut-on retourner un pointeur vers une variable locale ? -> variable-locale
  - Go passe-t-il les paramètres par valeur ou par référence ? -> passage-par-valeur
---

@@ rapide

```go
x := 10
p := &x          // p est un *int qui contient l'ADRESSE de x
fmt.Println(*p)  // 10 : la VALEUR pointée
*p = 20          // modifie x à travers le pointeur
fmt.Println(x)   // 20

func incrementer(n *int) { *n++ }
incrementer(&x)  // x vaut 21
```

- `&x` : « adresse de x ». `*p` : « valeur à l'adresse p ». `*int` : « pointeur vers un int ».
- La valeur zéro d'un pointeur est **`nil`** ; déréférencer `nil` provoque un `panic`.
- Go passe **tout par valeur** : pour qu'une fonction modifie une variable, on lui passe un pointeur.
- Pas d'arithmétique de pointeurs (contrairement au C) : c'est sûr.

@@ detail

## Les bases : & et * {#bases}

Chaque variable occupe un emplacement en mémoire, identifié par une **adresse**.

```go
age := 30
ptr := &age

fmt.Println(age)  // 30
fmt.Println(ptr)  // 0xc000012345 (une adresse)
fmt.Println(*ptr) // 30

*ptr = 31
fmt.Println(age) // 31
```

| Écriture | Signification |
|---|---|
| `*int` (dans un type) | type « pointeur vers un int » |
| `&age` | l'adresse de `age` |
| `*ptr` (dans une expression) | la valeur stockée à l'adresse `ptr` |

## Passage par valeur {#passage-par-valeur}

En Go, **tous** les arguments sont passés par **valeur** : la fonction reçoit une **copie**.

```go
func doubler(n int) {
	n *= 2 // modifie la copie
}

func doublerPtr(n *int) {
	*n *= 2 // modifie la variable d'origine
}

x := 5
doubler(x)
fmt.Println(x) // 5
doublerPtr(&x)
fmt.Println(x) // 10
```

Avec un pointeur, c'est l'**adresse** qui est copiée : la fonction peut donc atteindre la variable d'origine.

:::info Slices, maps et channels
Ces types contiennent déjà un pointeur interne. Passer une map à une fonction permet donc de la modifier sans `*`. Mais la longueur d'une slice, elle, n'est pas partagée : voir [[slices#fonctions]].
:::

## Modifier une variable dans une fonction {#modifier-fonction}

```go
type Compte struct{ Solde int }

func deposer(c *Compte, montant int) {
	c.Solde += montant // équivaut à (*c).Solde : déréférencement automatique
}

compte := Compte{Solde: 100}
deposer(&compte, 50)
fmt.Println(compte.Solde) // 150
```

Pour les structs, Go **déréférence automatiquement** : on écrit `c.Solde` et non `(*c).Solde`.

## Le pointeur nil {#nil}

```go
var p *int
fmt.Println(p == nil) // true
fmt.Println(*p)       // ❌ panic: runtime error: invalid memory address or nil pointer dereference
```

C'est l'erreur à l'exécution la plus courante en Go. Avant de déréférencer un pointeur qui peut être nil, vérifiez-le :

```go
func afficher(u *Utilisateur) {
	if u == nil {
		fmt.Println("aucun utilisateur")
		return
	}
	fmt.Println(u.Nom)
}
```

Causes fréquentes : une fonction qui renvoie `nil, err` dont on ignore l'erreur, un champ pointeur de struct jamais initialisé, une map de pointeurs qui renvoie `nil` pour une clé absente.

## Créer un pointeur {#creer}

```go
x := 0
p1 := &x                    // adresse d'une variable existante
p2 := new(int)              // alloue un int à 0 et renvoie son adresse
p3 := &Personne{Nom: "Ada"} // adresse d'un littéral de struct (très courant)
```

`&` ne s'applique qu'à ce qui est **adressable** : une variable, un champ, un élément de slice ou un littéral composite. `&42` ou `&f()` ne compilent pas. Voir [[faq-make-new]].

## Retourner un pointeur vers une variable locale {#variable-locale}

En C, c'est un bug grave. En Go, c'est **parfaitement sûr** :

```go
func NewCompteur() *int {
	n := 0
	return &n // n continue d'exister tant qu'il est référencé
}
```

Le compilateur effectue une **analyse d'échappement** (*escape analysis*) : s'il voit que `n` survit à la fonction, il l'alloue sur le **tas** (heap) au lieu de la **pile**, et le ramasse-miettes la libérera quand plus personne ne la référence. Voir [[memoire-performance]].

## Pointeurs et méthodes {#methodes}

Une méthode avec un **receiver pointeur** peut modifier la valeur sur laquelle elle est appelée :

```go
func (c *Compte) Deposer(m int) { c.Solde += m }

c := Compte{}
c.Deposer(10) // Go prend automatiquement &c
```

Voir [[methodes]] et [[faq-receiver-pointeur]].

## Pointeurs pour les valeurs optionnelles {#optionnel}

Un pointeur peut distinguer « absent » (`nil`) de « valeur zéro » :

```go
type Filtre struct {
	AgeMin *int // nil = pas de filtre ; 0 = âge minimum 0
}

func ptr[T any](v T) *T { return &v } // petite fonction utilitaire générique

f := Filtre{AgeMin: ptr(18)}
if f.AgeMin != nil {
	fmt.Println("âge minimum :", *f.AgeMin)
}
```

## Pas d'arithmétique de pointeurs {#securite}

`p++` ou `p + 4` sur un pointeur ne compilent pas. Go garantit ainsi qu'un pointeur désigne toujours une valeur valide (ou `nil`). Le package `unsafe` permet de contourner ces règles, mais il est réservé à des cas très particuliers.

## Quand utiliser des pointeurs ? {#quand}

- ✅ Pour qu'une fonction ou une méthode **modifie** une valeur.
- ✅ Pour éviter de copier de **grosses** structs.
- ✅ Pour les types qui ne doivent pas être copiés (contenant un `sync.Mutex`, un `bytes.Buffer`…).
- ✅ Pour représenter une valeur **optionnelle**.
- ❌ Pas pour les petites valeurs non modifiées (`int`, petites structs) : la copie est plus rapide et plus sûre.
- ❌ Pas de pointeur vers une slice, une map ou une interface « pour les performances » : ces types sont déjà légers.
