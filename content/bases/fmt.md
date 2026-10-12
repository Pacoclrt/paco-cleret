---
title: Afficher et formater avec fmt
category: bases
order: 8
level: débutant
summary: Le package fmt affiche (Println, Printf), formate en chaîne (Sprintf), écrit dans un flux (Fprintf) et lit des entrées (Scan). Les verbes comme %v, %d, %s, %.2f contrôlent le format.
aliases: fmt, print, println, printf, sprintf, fprintf, sprint, errorf, afficher, affichage, imprimer, écrire à l'écran, console, format, formater, verbe, %v, %d, %s, %f, %T, %+v, %q, padding, aligner, stringer, scan, scanln, sscanf
related: string, conversions, faq-saisie-clavier, interfaces
questions:
  - Comment afficher du texte en Go ?
  - Quelle différence entre Print, Println et Printf ? -> fonctions
  - Quels sont les verbes de Printf (%d, %s, %v…) ? -> verbes
  - Comment afficher un nombre avec 2 décimales ? -> largeur-precision
  - Comment aligner du texte en colonnes ? -> largeur-precision
  - Comment afficher une struct avec le nom des champs ? -> verbes
  - Comment personnaliser l'affichage de mon type ? -> stringer
---

@@ rapide

```go
nom, age := "Ada", 36

fmt.Print("Salut", nom, "\n")         // pas d'espace entre deux chaînes, pas de saut de ligne
fmt.Println("Salut", nom, age)        // espaces entre arguments + saut de ligne
fmt.Printf("%s a %d ans\n", nom, age) // format personnalisé

msg := fmt.Sprintf("%s (%d)", nom, age) // renvoie une string au lieu d'afficher
```

Les verbes essentiels :

| Verbe | Pour | Exemple → résultat |
|---|---|---|
| `%v` | n'importe quelle valeur | `{Ada 36}` |
| `%+v` | struct avec noms de champs | `{Nom:Ada Age:36}` |
| `%T` | le type | `main.Personne` |
| `%d` | entier | `42` |
| `%.2f` | flottant à 2 décimales | `3.14` |
| `%s` / `%q` | chaîne / entre guillemets | `Ada` / `"Ada"` |
| `%c` | caractère (rune) | `é` |
| `%t` | booléen | `true` |

@@ detail

## Les familles de fonctions {#fonctions}

| Préfixe | Destination | Exemple |
|---|---|---|
| `Print…` | sortie standard (terminal) | `fmt.Println("ok")` |
| `Sprint…` | renvoie une `string` | `s := fmt.Sprintf("%d", n)` |
| `Fprint…` | un `io.Writer` (fichier, réponse HTTP, `os.Stderr`…) | `fmt.Fprintln(os.Stderr, "erreur")` |
| `Append…` | ajoute à une `[]byte` (Go 1.19+) | `b = fmt.Appendf(b, "%d", n)` |

Et pour chaque famille, trois variantes :

- `Print` : concatène les arguments ; ajoute un espace entre deux arguments seulement si aucun n'est une chaîne.
- `Println` : ajoute **toujours** un espace entre les arguments et un **saut de ligne** à la fin.
- `Printf` : utilise une **chaîne de format** avec des verbes ; pas de saut de ligne automatique (pensez au `\n`).

```go
fmt.Print(1, 2, "a", "b", 3, "\n") // 1 2ab3   (subtil : préférez Println ou Printf)
fmt.Println(1, 2, "a", "b", 3)     // 1 2 a b 3
```

## Les verbes {#verbes}

### Généraux

```go
type Personne struct {
	Nom string
	Age int
}
p := Personne{"Ada", 36}

fmt.Printf("%v\n", p)  // {Ada 36}
fmt.Printf("%+v\n", p) // {Nom:Ada Age:36}
fmt.Printf("%#v\n", p) // main.Personne{Nom:"Ada", Age:36}  (syntaxe Go)
fmt.Printf("%T\n", p)  // main.Personne
fmt.Printf("%%\n")     // %  (un pourcentage littéral)
```

`%+v` est **le** verbe de débogage : il affiche les noms des champs.

### Entiers

| Verbe | `42` donne |
|---|---|
| `%d` | `42` |
| `%b` | `101010` (binaire) |
| `%o` | `52` (octal) |
| `%x` / `%X` | `2a` / `2A` (hexadécimal) |
| `%c` | `*` (caractère de code 42) |
| `%U` | `U+002A` |
| `%08b` | `00101010` |

### Flottants

| Verbe | `3.14159` donne |
|---|---|
| `%f` | `3.141590` |
| `%.2f` | `3.14` |
| `%e` | `3.141590e+00` |
| `%g` | `3.14159` (format le plus compact) |

### Chaînes et octets

| Verbe | `"go"` donne |
|---|---|
| `%s` | `go` |
| `%q` | `"go"` (avec échappements) |
| `%x` | `676f` |
| `% x` | `67 6f` |

### Autres

| Verbe | Usage |
|---|---|
| `%t` | booléen : `true` |
| `%p` | adresse d'un pointeur : `0xc000012345` |
| `%w` | uniquement dans `fmt.Errorf`, pour envelopper une erreur |

## Largeur, précision et alignement {#largeur-precision}

La forme générale est `%[drapeaux][largeur][.précision]verbe`.

```go
fmt.Printf("|%5d|\n", 42)        // |   42|  largeur 5, aligné à droite
fmt.Printf("|%-5d|\n", 42)       // |42   |  aligné à gauche
fmt.Printf("|%05d|\n", 42)       // |00042|  complété par des zéros
fmt.Printf("|%+d|\n", 42)        // |+42|    signe toujours affiché
fmt.Printf("|%8.2f|\n", 3.14159) // |    3.14|
fmt.Printf("|%-10s|\n", "Go")    // |Go        |
fmt.Printf("|%.3s|\n", "Gopher") // |Gop|  précision = longueur max
fmt.Printf("|%*d|\n", 6, 42)     // |    42|  largeur passée en argument
```

Un tableau aligné :

```go
produits := []struct {
	Nom  string
	Prix float64
}{{"Café", 2.5}, {"Croissant", 1.2}, {"Jus d'orange", 3.75}}

for _, p := range produits {
	fmt.Printf("%-15s %6.2f €\n", p.Nom, p.Prix)
}
```

```output
Café              2.50 €
Croissant         1.20 €
Jus d'orange      3.75 €
```

:::info Largeur et caractères accentués
La largeur se compte en **runes** pour `%s`, ce qui fonctionne bien avec les accents. Pour des colonnes plus complexes, le package `text/tabwriter` aligne automatiquement.
:::

## Arguments indexés {#arguments-indexes}

```go
fmt.Printf("%[1]d %[1]x %[1]b\n", 10) // 10 a 1010 : le même argument trois fois
```

## Personnaliser l'affichage : Stringer {#stringer}

Si un type possède une méthode `String() string`, `fmt` l'utilise pour `%v`, `%s` et `Println` :

```go
type Temperature float64

func (t Temperature) String() string {
	return fmt.Sprintf("%.1f °C", float64(t))
}

fmt.Println(Temperature(21.456)) // 21.5 °C
```

C'est l'interface `fmt.Stringer`. Attention à ne pas appeler `fmt.Sprintf("%v", t)` **dans** `String()` sur `t` lui-même : récursion infinie ! D'où la conversion `float64(t)` ci-dessus.

Pour les erreurs, `fmt` utilise de la même façon la méthode `Error() string`.

## Écrire sur la sortie d'erreur {#stderr}

```go
fmt.Fprintln(os.Stderr, "erreur : fichier introuvable")
os.Exit(1)
```

Séparer `stdout` (les résultats) de `stderr` (les messages d'erreur) permet de rediriger l'un sans l'autre dans le terminal.

## Lire une entrée : Scan {#scan}

```go
var nom string
var age int
fmt.Print("Nom et âge : ")
n, err := fmt.Scan(&nom, &age) // lit des mots séparés par des espaces
fmt.Println(n, err, nom, age)

var a, b int
fmt.Sscanf("12-34", "%d-%d", &a, &b) // depuis une chaîne : a=12, b=34
```

`fmt.Scan` s'arrête aux espaces. Pour lire une **ligne entière**, utilisez `bufio.Scanner` : voir [[faq-saisie-clavier]].

## Créer des erreurs : Errorf {#errorf}

```go
err := fmt.Errorf("utilisateur %d introuvable", id)
err = fmt.Errorf("chargement : %w", err) // %w enveloppe l'erreur d'origine
```

Voir [[erreurs]].

## Erreurs de format {#erreurs-format}

Si les verbes et les arguments ne correspondent pas, `fmt` ne plante pas mais affiche un marqueur :

```go
fmt.Printf("%d\n", "texte") // %!d(string=texte)
fmt.Printf("%d %d\n", 1)    // 1 %!d(MISSING)
fmt.Printf("%d\n", 1, 2)    // 1 puis %!(EXTRA int=2)
```

`go vet` détecte ces erreurs avant l'exécution.
