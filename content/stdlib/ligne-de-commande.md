---
title: Arguments, flags et variables d'environnement
category: stdlib
order: 3
level: débutant
summary: os.Args contient les arguments de la ligne de commande (os.Args[0] est le programme). Le package flag analyse les options (-port=8080). os.Getenv lit les variables d'environnement et os.Exit termine avec un code de sortie.
aliases: os.args, args, arguments, argument, ligne de commande, cli, terminal, flag, flags, option, options, paramètres du programme, os.getenv, getenv, variable d'environnement, env, os.exit, exit, code de sortie, stdin, stdout, stderr, entrée standard, sortie standard
related: fichiers, faq-saisie-clavier, premier-programme, conversions
questions:
  - Comment récupérer les arguments de la ligne de commande ? -> os-args
  - Comment gérer des options comme -v ou --port=8080 ? -> flag
  - Comment lire une variable d'environnement ? -> environnement
  - Comment quitter le programme avec un code d'erreur ? -> exit
  - Comment lire l'entrée standard (pipe) ? -> stdin
---

@@ rapide

```go
// go run . bonjour 42
fmt.Println(os.Args)      // [/tmp/go-build.../exe/app bonjour 42]
fmt.Println(os.Args[1:])  // [bonjour 42] : les vrais arguments
fmt.Println(len(os.Args)) // 3

// Options avec le package flag : go run . -port=9000 -v
port := flag.Int("port", 8080, "port d'écoute")
verbeux := flag.Bool("v", false, "mode verbeux")
flag.Parse()
fmt.Println(*port, *verbeux, flag.Args()) // 9000 true []

// Variable d'environnement
home := os.Getenv("HOME")

// Quitter avec un code d'erreur
os.Exit(1)
```

`os.Args[0]` est **le chemin du programme** ; les arguments commencent à `os.Args[1]`. Vérifiez toujours `len(os.Args)` avant d'y accéder.

@@ detail

## os.Args {#os-args}

`os.Args` est une `[]string` qui contient le nom du programme suivi des arguments, séparés par des espaces (le shell gère les guillemets) :

```bash
go run . "Ada Lovelace" 36
```

```go
package main

import (
	"fmt"
	"os"
	"strconv"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage : app <nom> <âge>")
		os.Exit(2)
	}
	nom := os.Args[1] // "Ada Lovelace"
	age, err := strconv.Atoi(os.Args[2])
	if err != nil {
		fmt.Fprintln(os.Stderr, "âge invalide :", err)
		os.Exit(2)
	}
	fmt.Printf("%s a %d ans\n", nom, age)
}
```

Les arguments sont **toujours des chaînes** : convertissez-les avec `strconv` (voir [[conversions]]).

Parcourir tous les arguments :

```go
for i, arg := range os.Args[1:] {
	fmt.Printf("argument %d : %s\n", i+1, arg)
}
```

## Le package flag {#flag}

Pour des options nommées, `flag` gère l'analyse, les valeurs par défaut, la conversion de type et l'aide :

```go
package main

import (
	"flag"
	"fmt"
	"strings"
	"time"
)

func main() {
	nom := flag.String("nom", "monde", "qui saluer")
	fois := flag.Int("n", 1, "nombre de répétitions")
	maj := flag.Bool("maj", false, "en majuscules")
	delai := flag.Duration("delai", 0, "pause entre deux saluts (ex. 500ms)")
	flag.Parse()

	for range *fois {
		msg := "Bonjour, " + *nom
		if *maj {
			msg = strings.ToUpper(msg)
		}
		fmt.Println(msg)
		time.Sleep(*delai)
	}
	fmt.Println("arguments restants :", flag.Args())
}
```

```bash
go run . -nom=Ada -n 2 --maj fichier1 fichier2
```

```output
BONJOUR, ADA
BONJOUR, ADA
arguments restants : [fichier1 fichier2]
```

Points à retenir :

- `flag.String`, `flag.Int`… renvoient des **pointeurs** : on lit la valeur avec `*nom`.
- Variante sans pointeur : `flag.StringVar(&nom, "nom", "monde", "…")`.
- Syntaxes acceptées : `-n 2`, `-n=2`, `--n=2`. Pour un booléen : `-maj` ou `-maj=false` (mais pas `-maj false`).
- L'analyse s'arrête au premier argument qui n'est pas une option ; la suite est dans `flag.Args()`.
- `-h` ou `-help` affiche automatiquement l'aide générée.

Pour des outils avec sous-commandes (`app serve`, `app migrate`), utilisez `flag.NewFlagSet` par sous-commande, ou une bibliothèque comme `cobra`.

## Variables d'environnement {#environnement}

```go
port := os.Getenv("PORT") // "" si absente
if port == "" {
	port = "8080"
}

cle, ok := os.LookupEnv("API_KEY") // distingue « absente » de « vide »
if !ok {
	log.Fatal("API_KEY manquante")
}

os.Setenv("MODE", "test")
for _, kv := range os.Environ() { // toutes, au format "CLE=valeur"
	fmt.Println(kv)
}
```

```bash
PORT=9000 go run .
```

C'est la manière standard de configurer une application déployée (conteneurs, cloud) : *12-factor app*.

## Codes de sortie : os.Exit {#exit}

```go
os.Exit(0) // succès
os.Exit(1) // erreur générale
os.Exit(2) // mauvaise utilisation (convention des outils en ligne de commande)
```

:::warning os.Exit est brutal
`os.Exit` termine immédiatement : les fonctions différées (`defer`) **ne sont pas exécutées**, les tampons non vidés sont perdus. Une bonne pratique est de garder `main` minimal :

```go
func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "erreur :", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	// toute la logique ici, avec des defer qui s'exécutent normalement
	return nil
}
```
:::

`log.Fatal(err)` affiche le message puis appelle `os.Exit(1)`.

## Entrée et sorties standard {#stdin}

| Flux | Variable | Usage |
|---|---|---|
| Entrée standard | `os.Stdin` | clavier, ou données envoyées par un pipe |
| Sortie standard | `os.Stdout` | les résultats du programme |
| Sortie d'erreur | `os.Stderr` | messages d'erreur et de diagnostic |

```go
// Programme filtre : lit stdin, écrit en majuscules sur stdout
sc := bufio.NewScanner(os.Stdin)
for sc.Scan() {
	fmt.Println(strings.ToUpper(sc.Text()))
}
if err := sc.Err(); err != nil {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
```

```bash
cat notes.txt | go run .
echo "bonjour" | go run .
```

Pour poser des questions à l'utilisateur, voir [[faq-saisie-clavier]].
