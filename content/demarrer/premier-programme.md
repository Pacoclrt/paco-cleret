---
title: "Premier programme : Hello, World!"
category: demarrer
order: 3
level: débutant
summary: Créer un module, écrire un fichier main.go, puis l'exécuter avec go run ou le compiler avec go build.
aliases: hello world, bonjour, premier programme, main, func main, package main, débuter, commencer, commentaire, commentaires, point virgule
related: commande-go, packages, modules, fmt
questions:
  - Comment écrire mon premier programme en Go ?
  - Comment exécuter un programme Go ? -> executer
  - Que signifie package main ? -> anatomie
  - Comment écrire un commentaire en Go ? -> commentaires
  - Pourquoi l'accolade doit-elle être sur la même ligne ? -> points-virgules
---

@@ rapide

Créez un dossier, initialisez un **module**, écrivez `main.go`, puis lancez-le :

```bash
mkdir bonjour && cd bonjour
go mod init exemple.com/bonjour
```

```go title=main.go
package main // ce fichier produit un exécutable

import "fmt" // package standard d'affichage

func main() { // point d'entrée du programme
	fmt.Println("Hello, World!")
}
```

```bash
go run .        # compile et exécute en une étape
go build        # produit un exécutable « bonjour »
./bonjour
```

Trois éléments sont obligatoires pour un exécutable : **`package main`**, une fonction **`func main()`**, et les **imports** des packages utilisés.

@@ detail

## Créer le projet {#creer-le-projet}

Tout code Go vit dans un **module**, décrit par un fichier `go.mod`. On le crée avec `go mod init` suivi d'un **chemin de module**, souvent l'adresse du dépôt (par exemple `github.com/pseudo/bonjour`). Pour un projet local, n'importe quel nom fait l'affaire.

```bash
mkdir bonjour
cd bonjour
go mod init exemple.com/bonjour
```

Le fichier `go.mod` généré ressemble à ceci :

```text title=go.mod
module exemple.com/bonjour

go 1.24
```

Détails dans [[modules]].

## Anatomie du programme {#anatomie}

```go title=main.go
// Le programme bonjour affiche un message de bienvenue.
package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
```

Ligne par ligne :

1. `package main` : chaque fichier Go commence par la déclaration de son **package**. Le package `main` est spécial : il produit un **programme exécutable** (et non une bibliothèque).
2. `import "fmt"` : on importe le package `fmt` (*format*) de la bibliothèque standard, qui sert à afficher du texte.
3. `func main()` : la fonction `main` du package `main` est le **point d'entrée**. Elle ne prend aucun argument et ne retourne rien. Quand elle se termine, le programme s'arrête.
4. `fmt.Println(...)` : on appelle la fonction `Println` du package `fmt`. Elle commence par une **majuscule** car elle est **exportée** (visible hors de son package, voir [[packages]]).

Pour importer plusieurs packages, on utilise des parenthèses :

```go
import (
	"fmt"
	"os"
	"strings"
)
```

## Exécuter et compiler {#executer}

| Commande | Effet |
|---|---|
| `go run .` | Compile dans un dossier temporaire et exécute immédiatement. Idéal pendant le développement. |
| `go run main.go` | Pareil, mais seulement avec ce fichier. |
| `go build` | Produit un exécutable dans le dossier courant (`bonjour`, ou `bonjour.exe` sous Windows). |
| `go build -o app` | Choisit le nom de l'exécutable. |
| `go install` | Compile et place l'exécutable dans `~/go/bin`. |

L'exécutable produit est **autonome** : vous pouvez le copier sur une autre machine du même système et le lancer sans installer Go.

## Les commentaires {#commentaires}

```go
// Commentaire sur une ligne : le plus courant.

/*
   Commentaire sur plusieurs lignes.
   Utile pour désactiver temporairement un bloc de code.
*/
```

Un commentaire placé juste au-dessus d'une déclaration (fonction, type, package) est un **commentaire de documentation**. Il doit commencer par le nom de l'élément :

```go
// Saluer renvoie un message de bienvenue pour nom.
func Saluer(nom string) string {
	return "Bonjour, " + nom
}
```

## Points-virgules et accolades {#points-virgules}

En Go, les points-virgules existent mais **le compilateur les ajoute automatiquement** en fin de ligne. Conséquence importante : **l'accolade ouvrante doit être sur la même ligne** que l'instruction.

```go
// ✅ Correct
func main() {
}

// ❌ Erreur de compilation : un point-virgule est inséré après « main() »
func main()
{
}
```

Pas de débat sur le style : `gofmt` formate tout le monde pareil (tabulations pour l'indentation, accolades sur la même ligne).

## Les erreurs de compilation fréquentes {#erreurs-frequentes}

Go est strict, et c'est une bonne chose. Deux erreurs surprennent souvent au début :

```go
package main

import (
	"fmt"
	"os" // ❌ "os" imported and not used
)

func main() {
	x := 42 // ❌ declared and not used: x
	fmt.Println("salut")
}
```

Un **import inutilisé** ou une **variable locale inutilisée** empêchent la compilation. Voir [[faq-erreurs-compilation]] pour la liste des erreurs courantes et leurs solutions.

## Aller plus loin : lire un argument {#exemple-arguments}

```go title=main.go
package main

import (
	"fmt"
	"os"
)

func main() {
	nom := "le monde"
	if len(os.Args) > 1 {
		nom = os.Args[1]
	}
	fmt.Printf("Bonjour, %s !\n", nom)
}
```

```bash
go run . Paco
```

```output
Bonjour, Paco !
```

Voir [[ligne-de-commande]] pour tout savoir sur `os.Args` et les flags.
