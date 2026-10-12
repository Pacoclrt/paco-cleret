---
title: Pourquoi mes goroutines affichent-elles toutes la même valeur ?
category: faq
order: 20
level: intermédiaire
summary: Avant Go 1.22, la variable d'une boucle for était partagée entre toutes les itérations, et les goroutines ou closures qui la capturaient voyaient sa dernière valeur. Depuis Go 1.22 (selon la version de go.mod), chaque itération a sa propre variable.
aliases: variable de boucle, loop variable, closure boucle, goroutine boucle, même valeur, dernière valeur, capture de variable, i := i, loopvar, go 1.22, 3 3 3
related: for, closures, goroutines
questions:
  - Pourquoi mes goroutines dans une boucle affichent la même valeur ?
  - Qu'est-ce qui a changé avec Go 1.22 pour les boucles ? -> go-1-22
  - Que signifie i := i dans une boucle ? -> ancienne-correction
---

@@ rapide

```go
for i := 0; i < 3; i++ {
	go func() {
		fmt.Println(i)
	}()
}
```

- **Go 1.22 et plus** (avec `go 1.22` ou plus dans `go.mod`) : affiche `0`, `1`, `2` dans un ordre quelconque. Chaque itération a sa **propre** variable `i`.
- **Avant Go 1.22** : affiche souvent `3 3 3`. Une **seule** variable `i` était partagée, et les goroutines lisaient sa valeur finale.

Si vous rencontrez le problème, vérifiez la directive `go` de votre `go.mod`, ou passez la valeur en paramètre :

```go
for i := 0; i < 3; i++ {
	go func(n int) {
		fmt.Println(n)
	}(i) // i est copié au moment du lancement
}
```

@@ detail

## L'ancien comportement {#ancien}

Jusqu'à Go 1.21, une boucle `for` déclarait **une seule** variable, modifiée à chaque tour. Une closure capture la **variable** (par référence), pas sa valeur :

```go
var fonctions []func()
for i := 0; i < 3; i++ {
	fonctions = append(fonctions, func() { fmt.Println(i) })
}
for _, f := range fonctions {
	f()
}
// Avant Go 1.22 : 3 3 3  (toutes les closures partagent le même i, qui vaut 3 à la fin)
// Depuis Go 1.22 : 0 1 2
```

Avec des goroutines, le résultat était en plus **aléatoire** (ça dépendait du moment où chaque goroutine s'exécutait) et constituait une **data race**.

Ce bug était si fréquent qu'il figurait en tête des FAQ et que `go vet` avait une vérification dédiée.

## Le changement de Go 1.22 {#go-1-22}

Depuis Go 1.22, **chaque itération** d'une boucle `for` (les deux formes : `for i := …; …; …` et `for … range`) crée une **nouvelle variable**. Le code naturel fait donc ce qu'on attend.

Le nouveau comportement s'applique selon la **version déclarée dans `go.mod`** du module, pas selon la version installée :

```text title=go.mod
module exemple.com/app

go 1.22   // ← à partir de cette valeur, nouvelle sémantique
```

Un vieux module avec `go 1.20` garde l'ancien comportement, même compilé avec un Go récent : c'est ce qui garantit la compatibilité.

## L'ancienne correction : i := i {#ancienne-correction}

Vous verrez souvent cette ligne dans du code antérieur à Go 1.22 :

```go
for _, v := range valeurs {
	v := v // crée une copie locale à l'itération
	go func() {
		traiter(v)
	}()
}
```

Elle **masque** la variable de boucle par une nouvelle variable propre à l'itération. Avec Go 1.22+, elle est inutile (mais sans danger) et peut être supprimée.

Autre correction classique : passer la valeur en **argument**, car les arguments sont évalués au moment du `go` :

```go
for _, v := range valeurs {
	go traiter(v)       // appel direct : v est copié
	go func(x string) { // ou closure avec paramètre
		traiter(x)
	}(v)
}
```

## Ce qui reste partagé {#partage}

Seules les variables **déclarées par l'en-tête de la boucle** sont recréées. Une variable déclarée **avant** la boucle reste unique et partagée :

```go
var dernier string
for _, v := range valeurs {
	dernier = v
	go func() { fmt.Println(dernier) }() // ⚠️ toujours partagé, et data race
}
```

## N'oubliez pas d'attendre {#attendre}

Même avec la bonne valeur capturée, le programme doit attendre ses goroutines, sinon `main` peut se terminer avant qu'elles n'affichent quoi que ce soit :

```go
var wg sync.WaitGroup
for i := range 3 {
	wg.Add(1)
	go func() {
		defer wg.Done()
		fmt.Println(i)
	}()
}
wg.Wait()
```

Voir [[faq-attendre-goroutines]], [[for#variable-par-iteration]] et [[closures#boucles]].
