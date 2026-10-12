---
title: "Conditions : if / else"
category: controle
order: 1
level: débutant
summary: if exécute un bloc si une condition booléenne est vraie. Pas de parenthèses, accolades obligatoires, et une instruction d'initialisation optionnelle (if v, err := f(); err != nil).
aliases: if, else, else if, condition, conditions, si, sinon, test, tester, booléen, comparaison, early return, retour anticipé, guard clause, clause de garde
related: switch, operateurs, erreurs, for
questions:
  - Comment écrire une condition if en Go ?
  - Comment déclarer une variable dans un if ? -> initialisation
  - Pourquoi Go refuse if (x) sans comparaison ? -> booleen-obligatoire
  - Comment éviter les if imbriqués ? -> retour-anticipe
---

@@ rapide

```go
age := 20

if age >= 18 {
	fmt.Println("majeur")
} else if age >= 13 {
	fmt.Println("ado")
} else {
	fmt.Println("enfant")
}

// Avec une instruction d'initialisation (très courant avec les erreurs)
if n, err := strconv.Atoi("42"); err != nil {
	fmt.Println("erreur :", err)
} else {
	fmt.Println("nombre :", n)
}
```

- **Pas de parenthèses** autour de la condition, mais les **accolades sont obligatoires**, même pour une seule ligne.
- La condition doit être un vrai **`bool`** : `if n` ne compile pas si `n` est un nombre.
- `else` doit être sur la **même ligne** que l'accolade fermante `}`.

@@ detail

## Syntaxe {#syntaxe}

```go
if condition {
	// exécuté si condition est vraie
}

if condition {
	// …
} else {
	// sinon
}

if c1 {
} else if c2 {
} else {
}
```

Contraintes de syntaxe (liées à l'insertion automatique des points-virgules) :

```go
// ❌ accolade sur la ligne suivante
if x > 0
{
}

// ❌ else sur une nouvelle ligne
if x > 0 {
}
else {
}
```

## Une condition booléenne obligatoire {#booleen-obligatoire}

Go n'a pas de valeurs « truthy » ou « falsy » : `0`, `""` ou `nil` ne sont pas faux, ils sont simplement d'un autre type.

```go
n := 3
s := ""
var p *int

if n != 0 {
} // ✅ et non « if n »
if s != "" {
} // ✅ et non « if s »
if p != nil {
} // ✅ et non « if p »
if len(liste) > 0 {
}
```

## L'instruction d'initialisation {#initialisation}

Avant la condition, on peut placer une instruction courte, séparée par `;`. Les variables ainsi déclarées n'existent **que dans le `if` et ses `else`** :

```go
if v, ok := cache[cle]; ok {
	fmt.Println("trouvé :", v)
} else {
	fmt.Println("absent, v vaut", v) // v est aussi visible ici
}
// v et ok n'existent plus ici
```

C'est l'idiome classique pour gérer une erreur sans polluer la fonction :

```go
if err := sauvegarder(donnees); err != nil {
	return fmt.Errorf("sauvegarde : %w", err)
}
```

## Le retour anticipé {#retour-anticipe}

En Go, on préfère **traiter les cas d'erreur d'abord et sortir tôt**, pour garder le chemin « normal » aligné à gauche, sans imbrication.

```go
// ❌ Pyramide d'imbrications difficile à lire
func traiter(u *Utilisateur) error {
	if u != nil {
		if u.Actif {
			if u.Email != "" {
				return envoyer(u.Email)
			} else {
				return errors.New("email vide")
			}
		} else {
			return errors.New("inactif")
		}
	}
	return errors.New("utilisateur nil")
}

// ✅ Clauses de garde : chaque problème est traité puis on sort
func traiter(u *Utilisateur) error {
	if u == nil {
		return errors.New("utilisateur nil")
	}
	if !u.Actif {
		return errors.New("inactif")
	}
	if u.Email == "" {
		return errors.New("email vide")
	}
	return envoyer(u.Email)
}
```

:::tip Pas de else après un return
Si le bloc `if` se termine par `return`, `break`, `continue` ou `panic`, le `else` est inutile. Les linters le signalent (`indent-error-flow`).
:::

## Combiner des conditions {#combiner}

```go
if age >= 18 && aPermis {
	fmt.Println("peut conduire")
}

if jour == "samedi" || jour == "dimanche" {
	fmt.Println("week-end")
}

if !(x > 0 && x < 10) {
	fmt.Println("hors de ]0, 10[")
}
```

Les opérateurs `&&` et `||` sont **court-circuités** (voir [[operateurs#logiques|opérateurs logiques]]). Quand les `else if` s'accumulent sur une même variable, un [[switch]] est souvent plus lisible.

## Pas d'opérateur ternaire {#ternaire}

```go
// Pas de : etat := ok ? "oui" : "non"
etat := "non"
if ok {
	etat = "oui"
}
```

## Comparer des chaînes, des flottants, des erreurs {#comparaisons}

```go
if strings.EqualFold(reponse, "OUI") {
} // insensible à la casse
if math.Abs(a-b) < 1e-9 {
} // flottants : jamais ==
if errors.Is(err, os.ErrNotExist) {
} // erreurs : errors.Is plutôt que ==
```
