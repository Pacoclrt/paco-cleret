---
title: Fonctions anonymes et closures
category: fonctions
order: 2
level: intermédiaire
summary: Une fonction anonyme se déclare sans nom (func(x int) int { … }). Une closure est une fonction anonyme qui capture des variables de son environnement et peut les modifier, même après la fin de la fonction englobante.
aliases: closure, closures, fermeture, fonction anonyme, fonctions anonymes, lambda, fonction lambda, callback, rappel, iife, capturer, capture de variable, générateur, compteur, middleware
related: fonctions, for, goroutines, defer, faq-boucle-goroutine, tri
questions:
  - Qu'est-ce qu'une closure en Go ?
  - Comment écrire une fonction anonyme (lambda) ? -> anonymes
  - Comment une closure capture-t-elle les variables ? -> capture
  - Pourquoi mes closures dans une boucle affichent la même valeur ? -> boucles
  - À quoi servent les closures en pratique ? -> usages
---

@@ rapide

```go
// Fonction anonyme stockée dans une variable
carre := func(x int) int { return x * x }
fmt.Println(carre(4)) // 16

// Appelée immédiatement
func() { fmt.Println("tout de suite") }()

// Closure : la fonction retournée « se souvient » de compteur
func nouveauCompteur() func() int {
	compteur := 0
	return func() int {
		compteur++
		return compteur
	}
}

suivant := nouveauCompteur()
fmt.Println(suivant(), suivant(), suivant()) // 1 2 3
```

Une **closure** capture les variables **par référence** : elle voit et modifie la variable elle-même, pas une copie. On en utilise partout : `defer`, goroutines, tri, handlers HTTP, middlewares.

@@ detail

## Les fonctions anonymes {#anonymes}

Une fonction anonyme est une fonction **sans nom**, écrite là où on en a besoin :

```go
// Dans une variable
saluer := func(nom string) string {
	return "Salut " + nom
}
fmt.Println(saluer("Ada"))

// En argument
slices.SortFunc(personnes, func(a, b Personne) int {
	return cmp.Compare(a.Age, b.Age)
})

// Exécutée immédiatement (IIFE)
resultat := func(a, b int) int {
	return a * b
}(6, 7) // 42
```

Les fonctions **nommées** ne peuvent être déclarées qu'au niveau du package. Dans une fonction, on utilise donc une fonction anonyme affectée à une variable.

## Capturer des variables {#capture}

Une fonction anonyme peut utiliser les variables de la fonction qui l'entoure. On dit qu'elle les **capture** et forme une **closure** (fermeture).

```go
func main() {
	total := 0
	ajouter := func(n int) {
		total += n // modifie la variable total de main
	}
	ajouter(5)
	ajouter(10)
	fmt.Println(total) // 15
}
```

La capture se fait **par référence** : la closure partage la variable, elle ne la copie pas. Et la variable **survit** tant que la closure existe, même après la fin de la fonction qui l'a déclarée :

```go
func generateurFibonacci() func() int {
	a, b := 0, 1
	return func() int {
		r := a
		a, b = b, a+b
		return r
	}
}

fib := generateurFibonacci()
for range 8 {
	fmt.Print(fib(), " ") // 0 1 1 2 3 5 8 13
}
```

Chaque appel à `generateurFibonacci` crée de **nouvelles** variables `a` et `b` : deux générateurs sont indépendants.

## Closures et boucles {#boucles}

Depuis **Go 1.22**, chaque itération d'une boucle `for` déclare une **nouvelle** variable. Les closures créées dans une boucle capturent donc chacune leur propre valeur :

```go
var fonctions []func()
for i := range 3 {
	fonctions = append(fonctions, func() { fmt.Println(i) })
}
for _, f := range fonctions {
	f() // 0, 1, 2
}
```

:::warning Avant Go 1.22
Avec un module qui déclare `go 1.21` ou moins dans `go.mod`, la variable de boucle est **partagée** : ce code affichait `3 3 3`. La solution de l'époque était de copier la variable (`i := i`) en début de boucle. Voir [[faq-boucle-goroutine]].
:::

En revanche, une variable déclarée **en dehors** de la boucle reste partagée par toutes les closures :

```go
compteur := 0
for range 3 {
	defer func() { fmt.Println(compteur) }() // les 3 closures partagent compteur
	compteur++
}
// affiche 3 3 3 à la sortie de la fonction
```

## Usages courants {#usages}

### Personnaliser un comportement

```go
nombres := []int{1, 2, 3, 4, 5, 6}
seuil := 3
grands := slices.DeleteFunc(slices.Clone(nombres), func(n int) bool {
	return n <= seuil // capture seuil
})
fmt.Println(grands) // [4 5 6]
```

### Fabriques de fonctions

```go
func multiplicateur(facteur int) func(int) int {
	return func(x int) int { return x * facteur }
}

double := multiplicateur(2)
triple := multiplicateur(3)
fmt.Println(double(5), triple(5)) // 10 15
```

### Middlewares HTTP

```go
func journaliser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		debut := time.Now()
		next(w, r)
		log.Printf("%s %s (%v)", r.Method, r.URL.Path, time.Since(debut))
	}
}
```

### Goroutines

```go
var wg sync.WaitGroup
for _, url := range urls {
	wg.Add(1)
	go func() {
		defer wg.Done()
		telecharger(url) // capture url (une variable par itération depuis Go 1.22)
	}()
}
wg.Wait()
```

### Mémoïsation

```go
func memoiser(f func(int) int) func(int) int {
	cache := map[int]int{}
	return func(n int) int {
		if v, ok := cache[n]; ok {
			return v
		}
		v := f(n)
		cache[n] = v
		return v
	}
}
```

## Closure récursive {#recursive}

Une fonction anonyme ne peut pas s'appeler par son nom… puisqu'elle n'en a pas. On déclare d'abord la variable, puis on l'affecte :

```go
var fact func(int) int
fact = func(n int) int {
	if n <= 1 {
		return 1
	}
	return n * fact(n-1)
}
fmt.Println(fact(5)) // 120
```

## Attention aux accès concurrents {#concurrence}

Si plusieurs goroutines exécutent des closures qui **modifient** la même variable capturée, c'est une **data race**. Protégez la variable avec un `sync.Mutex` ou utilisez un type atomique. Voir [[faq-data-race]].
