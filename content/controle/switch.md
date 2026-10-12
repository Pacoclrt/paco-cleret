---
title: switch
category: controle
order: 3
level: débutant
summary: switch compare une valeur à plusieurs cas et exécute le premier qui correspond, sans break nécessaire. Sans expression, il remplace une suite de if/else if.
aliases: switch, case, default, fallthrough, aiguillage, choix multiple, selon, type switch, switch true, plusieurs cas
related: if, interfaces, for, select
questions:
  - Comment utiliser switch en Go ?
  - Faut-il mettre break dans un switch en Go ? -> pas-de-break
  - Comment tester plusieurs valeurs dans un même case ? -> plusieurs-valeurs
  - Comment écrire un switch sans variable ? -> sans-expression
  - À quoi sert fallthrough ? -> fallthrough
  - Comment tester le type d'une variable avec switch ? -> type-switch
---

@@ rapide

```go
switch jour {
case "samedi", "dimanche": // plusieurs valeurs possibles
	fmt.Println("week-end")
case "lundi":
	fmt.Println("courage !")
default: // si aucun cas ne correspond
	fmt.Println("semaine")
}

switch { // sans expression : comme des if / else if
case note >= 16:
	fmt.Println("très bien")
case note >= 10:
	fmt.Println("admis")
default:
	fmt.Println("refusé")
}
```

- Le premier `case` qui correspond est exécuté, **puis le switch s'arrête** : pas besoin de `break`.
- `fallthrough` force le passage au cas suivant (rarement utile).
- Un **type switch** (`switch v := x.(type)`) teste le type d'une interface.

@@ detail

## Le switch d'expression {#expression}

```go
switch os := runtime.GOOS; os {
case "darwin":
	fmt.Println("macOS")
case "linux":
	fmt.Println("Linux")
case "windows":
	fmt.Println("Windows")
default:
	fmt.Printf("%s\n", os)
}
```

- L'expression est évaluée **une fois**, puis comparée aux `case` **de haut en bas**.
- Comme pour `if`, on peut ajouter une **instruction d'initialisation** avant l'expression (`os := runtime.GOOS;`).
- Les `case` peuvent être des expressions quelconques (pas seulement des constantes), du même type que l'expression testée.
- `default` est optionnel et peut être placé n'importe où (par convention, à la fin).

## Pas de break nécessaire {#pas-de-break}

Contrairement au C, au Java ou au JavaScript, Go **ne « tombe » pas** dans le cas suivant : chaque `case` se termine implicitement par un `break`. Fini les bugs dus à un `break` oublié.

`break` reste utilisable pour quitter un `case` plus tôt :

```go
switch {
case x > 0:
	if x > 100 {
		break // sort du switch
	}
	fmt.Println("petit positif")
}
```

## Plusieurs valeurs par case {#plusieurs-valeurs}

```go
func estVoyelle(r rune) bool {
	switch unicode.ToLower(r) {
	case 'a', 'e', 'i', 'o', 'u', 'y':
		return true
	}
	return false
}
```

## Le switch sans expression {#sans-expression}

Sans expression, `switch` équivaut à `switch true` : le premier `case` dont la condition est vraie l'emporte. C'est la manière idiomatique de remplacer une longue chaîne de `if … else if` :

```go
func mention(note float64) string {
	switch {
	case note < 0 || note > 20:
		return "invalide"
	case note >= 16:
		return "très bien"
	case note >= 14:
		return "bien"
	case note >= 12:
		return "assez bien"
	case note >= 10:
		return "passable"
	default:
		return "insuffisant"
	}
}
```

L'ordre des `case` compte : `note >= 16` doit être testé avant `note >= 14`.

## fallthrough {#fallthrough}

`fallthrough` transfère l'exécution au **corps du cas suivant**, **sans tester** sa condition :

```go
switch n := 2; n {
case 1:
	fmt.Println("un")
case 2:
	fmt.Println("deux")
	fallthrough
case 3:
	fmt.Println("trois (ou après deux)")
default:
	fmt.Println("défaut")
}
// deux
// trois (ou après deux)
```

`fallthrough` doit être la dernière instruction du `case` et n'est pas autorisé dans le dernier cas ni dans un type switch. On l'utilise très rarement : préférez lister plusieurs valeurs dans un même `case`.

## Le type switch {#type-switch}

Pour une valeur d'interface, le **type switch** teste son type concret :

```go
func decrire(x any) string {
	switch v := x.(type) {
	case nil:
		return "nil"
	case int, int64:
		return fmt.Sprintf("entier %v", v) // ici v est de type any (plusieurs types)
	case string:
		return "chaîne de " + strconv.Itoa(len(v)) + " octets" // v est une string
	case []int:
		return fmt.Sprintf("slice de %d entiers", len(v))
	case error:
		return "erreur : " + v.Error()
	default:
		return fmt.Sprintf("type inconnu %T", v)
	}
}
```

Dans chaque `case` à un seul type, `v` a **ce type précis**. Dans un `case` à plusieurs types, `v` garde le type de l'interface. Détails dans [[interfaces#type-switch]].

## switch dans une boucle {#dans-une-boucle}

Attention : `break` dans un `switch` sort du **switch**, pas de la boucle qui l'entoure. Utilisez un **label** :

```go
boucle:
for {
	switch lireCommande() {
	case "quitter":
		break boucle // sort de la boucle for
	case "aide":
		afficherAide()
	}
}
```
