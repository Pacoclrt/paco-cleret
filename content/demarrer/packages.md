---
title: Packages, imports et visibilité
category: demarrer
order: 6
level: débutant
summary: Un package est un dossier de fichiers .go. Un nom qui commence par une majuscule est exporté (public), sinon il reste privé au package.
aliases: package, packages, paquet, import, importer, exporté, export, public, privé, visibilité, majuscule, internal, init, alias d'import, import _, blank import, structure de projet, organisation, dossier cmd
related: modules, premier-programme, conventions
questions:
  - Qu'est-ce qu'un package en Go ?
  - Comment rendre une fonction publique ou privée ? -> visibilite
  - Comment importer un package de mon propre projet ? -> importer
  - À quoi sert la fonction init ? -> init
  - Comment organiser un projet Go ? -> organisation
  - À quoi sert le dossier internal ? -> internal
  - Que signifie import _ ? -> formes-import
---

@@ rapide

Un **package** = un **dossier** de fichiers `.go` qui commencent tous par la même ligne `package nom`. On l'utilise avec `import` :

```go
import (
	"fmt"                                    // bibliothèque standard
	"github.com/paco/monapp/internal/calcul" // package du projet
)
```

La visibilité dépend **uniquement de la première lettre** du nom :

```go
func Additionner(a, b int) int { return a + b }  // Majuscule : exportée (publique)
func arrondir(x float64) int   { return int(x) } // minuscule : privée au package
```

Pas de mots-clés `public` ou `private` : la casse suffit. C'est valable pour les fonctions, types, variables, constantes, champs de struct et méthodes.

@@ detail

## Un package, un dossier {#un-dossier}

```text
monapp/
├── go.mod                 module github.com/paco/monapp
├── main.go                package main
└── calcul/
    ├── addition.go        package calcul
    └── addition_test.go   package calcul
```

Règles :

- Tous les fichiers `.go` d'un même dossier appartiennent au **même package** (sauf les tests, qui peuvent utiliser `nom_test`).
- Par convention, le **nom du package = nom du dossier** : court, en minuscules, sans underscore (`calcul`, `httputil`, pas `Calcul_Utils`).
- Les fichiers d'un package partagent tout : une fonction privée déclarée dans `a.go` est utilisable dans `b.go`.

## Visibilité : exporté ou non {#visibilite}

```go title=calcul/addition.go
package calcul

// Pi est exportée : utilisable via calcul.Pi.
const Pi = 3.14159

// compteur n'est visible que dans le package calcul.
var compteur int

// Additionner est exportée.
func Additionner(a, b int) int {
	compteur++
	return a + b
}

// Point est un type exporté avec un champ exporté et un champ privé.
type Point struct {
	X     int // exporté
	cache int // privé : invisible hors du package (et ignoré par encoding/json !)
}
```

```go title=main.go
package main

import (
	"fmt"

	"github.com/paco/monapp/calcul"
)

func main() {
	fmt.Println(calcul.Additionner(2, 3)) // 5
	fmt.Println(calcul.Pi)
	// calcul.compteur → erreur : compteur n'est pas exporté
}
```

:::warning Le piège du JSON
Les champs en minuscule ne sont pas visibles par les autres packages, y compris `encoding/json`. Ils n'apparaissent donc pas dans le JSON. Voir [[faq-champs-json]].
:::

## Importer {#importer}

Le chemin d'import d'un package de votre projet = **chemin du module + chemin du dossier**. Dans l'exemple, `github.com/paco/monapp` + `/calcul`.

On utilise ensuite le **nom du package** (la dernière partie du chemin, en général) comme préfixe : `calcul.Additionner`.

`gofmt` (et l'outil `goimports`) trie les imports et les regroupe : bibliothèque standard d'abord, puis une ligne vide, puis les packages externes.

## Les différentes formes d'import {#formes-import}

```go
import (
	"fmt"         // normal : fmt.Println
	_ "image/png" // import pour ses effets de bord uniquement
	. "math"      // import « point » : Sqrt au lieu de math.Sqrt (à éviter)
	str "strings" // alias : str.ToUpper
)
```

| Forme | Usage |
|---|---|
| Alias `str "strings"` | Lever un conflit de noms entre deux packages |
| Blank `_ "pkg"` | Exécuter seulement les `init()` du package (pilotes SQL, décodeurs d'images…) |
| Point `. "pkg"` | À éviter : on ne sait plus d'où viennent les noms |

## La fonction init {#init}

Chaque fichier peut déclarer une ou plusieurs fonctions `init()`. Elles s'exécutent **automatiquement**, une seule fois, avant `main()` :

```go
var config map[string]string

func init() {
	config = map[string]string{"env": "dev"}
}
```

Ordre d'initialisation : d'abord les packages importés, puis les variables du package, puis les `init()`, puis `main()`.

:::tip Avec modération
`init` rend le code plus difficile à tester et à suivre. Préférez une initialisation explicite (une fonction `NewXxx` ou une valeur calculée directement dans la déclaration).
:::

## Le dossier internal {#internal}

Un package situé dans un dossier `internal/` ne peut être importé **que** par le code du dossier parent de `internal` (et ses sous-dossiers). C'est le compilateur qui l'impose.

```text
monapp/
├── internal/
│   └── db/          importable par monapp/... uniquement
└── main.go
```

Idéal pour garder privé du code partagé entre vos propres packages, sans l'exposer à vos utilisateurs.

## Les imports circulaires sont interdits {#cycles}

Si `a` importe `b`, alors `b` ne peut pas importer `a` (même indirectement). Le compilateur refuse avec `import cycle not allowed`. Solutions : déplacer le code commun dans un troisième package, ou faire dépendre l'un des deux d'une [[interfaces|interface]] plutôt que de l'autre package.

## Organiser un projet {#organisation}

Il n'existe pas de structure imposée. Commencez **simple**, et structurez au fur et à mesure :

```text
petit-outil/          un seul package main suffit
├── go.mod
└── main.go

api/                  projet plus conséquent
├── go.mod
├── cmd/
│   └── api/
│       └── main.go   point d'entrée (package main)
└── internal/
    ├── handler/      handlers HTTP
    ├── store/        accès aux données
    └── user/         logique métier
```

Conseils :

- Organisez par **fonctionnalité** (`user`, `commande`) plutôt que par type technique (`models`, `utils`).
- Évitez les packages fourre-tout `utils`, `common`, `helpers`.
- Le dossier `cmd/<nom>` accueille un exécutable par sous-dossier.
