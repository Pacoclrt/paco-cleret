---
title: Maps
category: donnees
order: 3
level: débutant
summary: Une map associe des clés à des valeurs (map[string]int). Elle s'initialise avec make ou un littéral, se lit avec la forme « v, ok := m[k] », et se parcourt dans un ordre aléatoire.
aliases: map, maps, dictionnaire, dico, dict, hashmap, hash map, table de hachage, tableau associatif, clé valeur, clé, valeur, delete, supprimer une clé, comma ok, ensemble, set, compter les occurrences, package maps, sync.Map
related: slices, structs, faq-ordre-map, for, sync
questions:
  - Qu'est-ce qu'une map en Go ?
  - Comment vérifier si une clé existe dans une map ? -> comma-ok
  - Comment supprimer une clé d'une map ? -> supprimer
  - Pourquoi « assignment to entry in nil map » ? -> map-nil
  - Comment parcourir une map dans l'ordre ? -> parcourir
  - Comment faire un ensemble (set) en Go ? -> ensemble
  - Comment compter les occurrences de mots ? -> compter
  - Une map est-elle utilisable par plusieurs goroutines ? -> concurrence
---

@@ rapide

```go
ages := map[string]int{"Ada": 36, "Linus": 54} // littéral
notes := make(map[string]float64)              // map vide prête à l'emploi

ages["Grace"] = 85           // ajouter ou modifier
fmt.Println(ages["Ada"])     // 36
fmt.Println(ages["Inconnu"]) // 0 : valeur zéro si la clé est absente

if age, ok := ages["Linus"]; ok { // tester la présence
	fmt.Println("trouvé :", age)
}

delete(ages, "Ada")    // supprimer
fmt.Println(len(ages)) // 2

for nom, age := range ages { // ordre ALÉATOIRE
	fmt.Println(nom, age)
}
```

Attention : une map déclarée avec `var m map[string]int` vaut **nil**, et **écrire** dedans provoque un `panic`. Initialisez-la avec `make` ou `{}`.

@@ detail

## Créer une map {#creer}

Le type s'écrit `map[TypeClé]TypeValeur`.

```go
var a map[string]int            // nil : lecture ok, écriture = panic
b := map[string]int{}           // vide, utilisable
c := make(map[string]int)       // vide, utilisable
d := make(map[string]int, 1000) // avec une capacité initiale (indicative)
e := map[string][]string{
	"fruits":  {"pomme", "poire"},
	"légumes": {"carotte"},
}
```

## Lire, écrire, supprimer {#lire-ecrire}

```go
m := map[string]int{}
m["a"] = 1     // ajout
m["a"] = 2     // modification
m["a"]++       // incrément direct
v := m["a"]    // lecture : 3
delete(m, "a") // suppression (aucun effet si la clé n'existe pas)
clear(m)       // vide toute la map (Go 1.21+)
```

## Tester la présence : comma ok {#comma-ok}

Lire une clé absente renvoie la **valeur zéro**, sans erreur. Impossible donc de distinguer « absente » de « présente avec la valeur 0 »… sauf avec la forme à deux valeurs :

```go
stock := map[string]int{"pommes": 0}

fmt.Println(stock["pommes"], stock["kiwis"]) // 0 0 : indiscernables

if qte, ok := stock["kiwis"]; !ok {
	fmt.Println("kiwis : référence inconnue")
} else {
	fmt.Println("kiwis :", qte)
}

_, existe := stock["pommes"] // true
```

## Supprimer {#supprimer}

```go
delete(m, cle)
```

`delete` ne renvoie rien et ne fait rien si la clé n'existe pas. On peut supprimer des clés **pendant** un `range` sans danger.

## La map nil {#map-nil}

```go
var m map[string]int
fmt.Println(m["x"], len(m)) // 0 0 : la lecture fonctionne
m["x"] = 1                  // ❌ panic: assignment to entry in nil map
```

Erreur classique avec une map dans une struct :

```go
type Index struct {
	mots map[string]int
}

idx := Index{}
idx.mots["go"]++ // ❌ panic : mots est nil

// ✅ initialiser dans un constructeur
func NewIndex() *Index {
	return &Index{mots: make(map[string]int)}
}
```

## Parcourir {#parcourir}

```go
for cle, valeur := range m {
}
for cle := range m {
}
```

L'ordre de parcours est **aléatoire** et change à chaque exécution (c'est volontaire, pour qu'on ne s'y fie pas). Pour un ordre déterministe, on trie les clés :

```go
for _, cle := range slices.Sorted(maps.Keys(m)) { // Go 1.23+
	fmt.Println(cle, m[cle])
}
```

Voir [[faq-ordre-map]] pour les versions plus anciennes et le tri par valeur.

## Les maps sont des références {#reference}

Une variable map contient un pointeur vers la structure interne. Affecter ou passer une map **ne la copie pas** :

```go
func ajouter(m map[string]int) {
	m["nouveau"] = 1 // visible par l'appelant
}

a := map[string]int{}
b := a
b["x"] = 1
fmt.Println(a["x"]) // 1 : a et b sont la même map
```

Pour une vraie copie : `copie := maps.Clone(original)`.

## Types de clés autorisés {#cles}

La clé doit être d'un type **comparable** avec `==` : nombres, strings, booléens, pointeurs, channels, interfaces, arrays et structs composés de types comparables. **Pas** de slice, map ou fonction comme clé.

```go
type Point struct{ X, Y int }
cases := map[Point]string{{0, 0}: "origine"} // struct comme clé
grille := map[[2]int]bool{{1, 2}: true}      // array comme clé
mauvais := map[[]int]bool{}                  // ❌ invalid map key type []int
```

## Modifier une struct dans une map {#structs-dans-map}

Les valeurs d'une map ne sont **pas adressables** : on ne peut pas modifier un champ directement.

```go
type Compte struct{ Solde int }
comptes := map[string]Compte{"ada": {100}}

comptes["ada"].Solde += 50 // ❌ cannot assign to struct field comptes["ada"].Solde in map

c := comptes["ada"] // ✅ 1. copier
c.Solde += 50       //    2. modifier
comptes["ada"] = c  //    3. réécrire

// ✅ ou stocker des pointeurs
ptrs := map[string]*Compte{"ada": {100}}
ptrs["ada"].Solde += 50
```

## Compter des occurrences {#compter}

Grâce à la valeur zéro, compter est très simple :

```go
texte := "le chat et le chien et le rat"
compte := make(map[string]int)
for _, mot := range strings.Fields(texte) {
	compte[mot]++ // la valeur zéro 0 sert de point de départ
}
fmt.Println(compte["le"], compte["et"]) // 3 2
```

De même pour regrouper : `groupes[cle] = append(groupes[cle], v)` fonctionne même si la clé est absente (append sur une slice nil).

## Un ensemble (set) {#ensemble}

Go n'a pas de type « set » : on utilise une map dont seules les clés comptent.

```go
vus := make(map[string]struct{}) // struct{} n'occupe aucun octet
vus["go"] = struct{}{}
if _, ok := vus["go"]; ok {
	fmt.Println("déjà vu")
}

// Variante plus lisible avec bool
deja := map[string]bool{}
deja["go"] = true
if deja["go"] {
} // false par défaut pour une clé absente
```

Exemple : supprimer les doublons d'une slice en gardant l'ordre.

```go
func Uniques(s []string) []string {
	vus := make(map[string]bool, len(s))
	var res []string
	for _, v := range s {
		if !vus[v] {
			vus[v] = true
			res = append(res, v)
		}
	}
	return res
}
```

## Le package maps {#package-maps}

| Fonction | Rôle |
|---|---|
| `maps.Clone(m)` | copie superficielle |
| `maps.Copy(dst, src)` | copie toutes les entrées de `src` dans `dst` |
| `maps.Equal(a, b)` | mêmes clés et mêmes valeurs ? |
| `maps.DeleteFunc(m, f)` | supprime les entrées qui vérifient `f` |
| `maps.Keys(m)` / `maps.Values(m)` | itérateurs sur les clés / valeurs (Go 1.23+) |
| `maps.Collect(seq)` | construit une map depuis un itérateur |

## Maps et concurrence {#concurrence}

Une map n'est **pas** protégée contre les accès concurrents. Si une goroutine écrit pendant qu'une autre lit ou écrit, le programme peut s'arrêter avec `fatal error: concurrent map writes`. Solutions :

- protéger la map avec un `sync.Mutex` ou `sync.RWMutex` ;
- utiliser `sync.Map` pour certains cas spécifiques (clés écrites une fois, lues souvent).

Voir [[sync]].
