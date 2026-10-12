---
title: Pourquoi mon erreur n'est-elle pas nil ?
category: faq
order: 9
level: avancé
summary: Une interface n'est nil que si son type ET sa valeur sont nil. Renvoyer un pointeur nil d'un type concret (*MonErreur) dans une interface error donne une interface non nil. Renvoyez directement nil.
aliases: nil interface, interface nil, erreur non nil, err != nil alors que nil, typed nil, nil typé, pointeur nil dans interface, piège nil, nil gotcha
related: interfaces, erreurs, pointeurs
questions:
  - Pourquoi err != nil alors que je renvoie un pointeur nil ?
  - Comment une interface peut-elle contenir nil sans être nil ? -> explication
  - Comment éviter le piège du nil typé ? -> eviter
---

@@ rapide

```go
type MonErreur struct{ msg string }

func (e *MonErreur) Error() string { return e.msg }

func verifier(ok bool) error {
	var e *MonErreur // pointeur nil
	if !ok {
		e = &MonErreur{"échec"}
	}
	return e // ⚠️ PIÈGE : renvoie une interface error NON nil, même si e est nil
}

err := verifier(true)
fmt.Println(err == nil) // false !
```

Une valeur d'interface est un couple **(type, valeur)**. Ici elle vaut `(*MonErreur, nil)` : le type est renseigné, donc l'interface n'est **pas** nil.

**Correction** : renvoyez `nil` explicitement.

```go
func verifier(ok bool) error {
	if !ok {
		return &MonErreur{"échec"}
	}
	return nil // ✅ interface (nil, nil)
}
```

@@ detail

## Ce que contient une interface {#explication}

En mémoire, une valeur d'interface contient deux mots :

```text
         type dynamique    valeur dynamique
var err error           →  (nil,          nil)   → err == nil  ✅
err = (*MonErreur)(nil) →  (*MonErreur,   nil)   → err != nil  ⚠️
err = &MonErreur{…}     →  (*MonErreur,   0xc0…) → err != nil
```

`err == nil` compare l'interface à l'interface nulle `(nil, nil)`. Dès que le **type** est connu, la comparaison est fausse, même si le pointeur à l'intérieur est nil.

```go
var p *MonErreur = nil
var err error = p

fmt.Println(p == nil)           // true  : on compare un pointeur
fmt.Println(err == nil)         // false : on compare une interface
fmt.Printf("%T %v\n", err, err) // *main.MonErreur <nil>
```

## Où le piège apparaît {#ou}

- Une fonction qui déclare une variable d'un **type d'erreur concret** et la renvoie comme `error`.
- Une fonction qui renvoie le résultat d'une autre fonction typée :

```go
func valider() *ErreurValidation { return nil }

func traiter() error {
	return valider() // ⚠️ (*ErreurValidation, nil) : non nil !
}
```

- Un champ de struct de type interface qu'on remplit avec un pointeur nil.

## Comment l'éviter {#eviter}

1. Une fonction qui renvoie une erreur doit avoir le type de retour **`error`**, et ses variables internes aussi :

```go
func traiter() error {
	if err := valider(); err != nil { // err est un *ErreurValidation ici…
		return err // … renvoyé seulement s'il n'est pas nil
	}
	return nil
}
```

2. Écrivez `return nil` littéralement dans le cas de succès.

3. Méfiez-vous des variables `var e *MonType` renvoyées comme interface.

:::tip Les linters
`staticcheck` et `go vet` (via certaines analyses) détectent plusieurs formes de ce piège, notamment la comparaison d'une interface avec un pointeur nil typé.
:::

## Détecter un pointeur nil dans une interface {#detecter}

Si vous recevez une interface et devez vérifier la valeur à l'intérieur, une assertion de type suffit dans les cas connus :

```go
if e, ok := err.(*MonErreur); ok && e == nil {
	fmt.Println("pointeur nil caché dans l'interface")
}
```

Mais si vous en arrivez là, mieux vaut corriger la fonction qui produit l'erreur.

## Le même piège avec toute interface {#autres}

Ce n'est pas propre à `error` : n'importe quelle interface (`io.Reader`, `any`, vos interfaces) se comporte pareil.

```go
var buf *bytes.Buffer
var r io.Reader = buf
fmt.Println(r == nil) // false
```

Voir [[interfaces#valeur-interface]] et [[erreurs]].
