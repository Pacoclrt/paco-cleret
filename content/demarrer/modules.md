---
title: Modules et dépendances
category: demarrer
order: 5
level: débutant
summary: Un module est un ensemble de packages versionnés ensemble, décrit par go.mod. go get ajoute des dépendances, go mod tidy les nettoie et go.sum garantit leur intégrité.
aliases: module, modules, go.mod, go.sum, dépendance, dépendances, go mod init, go mod tidy, go get, version, versionnement, semver, vendor, workspace, go work, gopriv, goprivate, librairie externe, installer un package
related: packages, commande-go, installation
questions:
  - Qu'est-ce qu'un module Go ?
  - Comment ajouter une dépendance (librairie externe) ? -> ajouter-dependance
  - À quoi sert le fichier go.sum ? -> go-sum
  - Comment mettre à jour une dépendance ? -> mettre-a-jour
  - Comment utiliser un module local non publié ? -> replace
  - Comment utiliser un dépôt privé ? -> prive
---

@@ rapide

Un **module** est un projet Go versionné. Il est défini par un fichier **`go.mod`** à sa racine :

```text title=go.mod
module github.com/paco/monapp

go 1.24

require github.com/google/uuid v1.6.0
```

Les commandes essentielles :

```bash
go mod init github.com/paco/monapp   # créer le module
go get github.com/google/uuid        # ajouter une dépendance
go mod tidy                          # synchroniser go.mod avec le code
```

Le fichier **`go.sum`** contient les empreintes cryptographiques des dépendances : il garantit que tout le monde compile exactement le même code. Les deux fichiers se versionnent dans Git.

@@ detail

## Module, package, dépôt {#vocabulaire}

- Un **package** est un dossier de fichiers `.go` qui se compilent ensemble (voir [[packages]]).
- Un **module** est un ensemble de packages publiés et versionnés ensemble. Il a un `go.mod` à sa racine.
- Un **dépôt** (Git) contient généralement un seul module.

Le **chemin du module** (`module github.com/paco/monapp`) sert de préfixe à tous les imports internes. Si le module contient un dossier `internal/stock`, on l'importe avec `"github.com/paco/monapp/internal/stock"`.

## Le fichier go.mod {#go-mod}

```text title=go.mod
module github.com/paco/monapp

go 1.24

require (
	github.com/google/uuid v1.6.0
	golang.org/x/sync v0.10.0
)

require golang.org/x/text v0.21.0 // indirect
```

| Directive | Rôle |
|---|---|
| `module` | Chemin (nom) du module |
| `go` | Version minimale de Go requise par le module |
| `toolchain` | Version de la chaîne d'outils conseillée (optionnelle) |
| `require` | Dépendances et leur version minimale |
| `// indirect` | Dépendance d'une dépendance, non importée directement |
| `replace` | Remplace un module par un autre chemin ou un dossier local |
| `exclude` | Interdit une version précise |
| `retract` | Signale qu'une version publiée de **ce** module est à éviter |
| `tool` | Déclare un outil utilisé par le projet (Go 1.24+) |

## Ajouter une dépendance {#ajouter-dependance}

Deux façons de faire :

```bash
# 1. Explicitement
go get github.com/google/uuid

# 2. Importer dans le code, puis laisser Go compléter go.mod
go mod tidy
```

```go
package main

import (
	"fmt"

	"github.com/google/uuid"
)

func main() {
	fmt.Println(uuid.NewString())
}
```

:::tip Trouver des packages
Le site [pkg.go.dev](https://pkg.go.dev) référence tous les modules publics, avec leur documentation, leurs versions et leurs licences.
:::

## Versions et versionnement sémantique {#versions}

Go utilise le **versionnement sémantique** : `vMAJEUR.MINEUR.CORRECTIF`.

- **Correctif** (`v1.2.3` → `v1.2.4`) : correction de bugs.
- **Mineur** (`v1.2.3` → `v1.3.0`) : nouvelles fonctionnalités compatibles.
- **Majeur** (`v1` → `v2`) : changements incompatibles.

Règle propre à Go : à partir de la `v2`, **le chemin du module change** et se termine par `/v2`. Deux versions majeures peuvent ainsi coexister :

```go
import "github.com/exemple/lib/v2"
```

Go choisit les versions avec l'algorithme **MVS** (*Minimal Version Selection*) : pour chaque dépendance, il prend la plus petite version qui satisfait toutes les contraintes. Résultat : des compilations **reproductibles**, sans fichier de verrouillage supplémentaire.

## Mettre à jour {#mettre-a-jour}

```bash
go list -m -u all                       # voir les mises à jour disponibles
go get github.com/google/uuid@latest    # dernière version
go get github.com/google/uuid@v1.5.0    # version précise (même plus ancienne)
go get -u ./...                         # tout mettre à jour (mineur et correctif)
go get -u=patch ./...                   # seulement les correctifs
go mod tidy                             # nettoyer ensuite
```

## Le fichier go.sum {#go-sum}

`go.sum` contient une **empreinte** (hash) de chaque version de module téléchargée. À chaque téléchargement, Go vérifie que le contenu correspond, et le compare aussi à la base publique `sum.golang.org`. Impossible donc qu'une dépendance soit modifiée silencieusement.

- **Versionnez** `go.mod` et `go.sum`.
- Ne les modifiez **pas** à la main : utilisez `go get` et `go mod tidy`.

## Utiliser un module local : replace {#replace}

Pour tester une modification d'une bibliothèque sans la publier :

```text title=go.mod
replace github.com/paco/malib => ../malib
```

Pour travailler sur plusieurs modules à la fois, les **workspaces** évitent de toucher à `go.mod` :

```bash
go work init ./monapp ./malib
```

Le fichier `go.work` créé n'est en général **pas** versionné.

## Dépôts privés {#prive}

Par défaut, Go télécharge via le proxy public `proxy.golang.org`, qui ne voit pas vos dépôts privés. Indiquez lesquels contourner :

```bash
go env -w GOPRIVATE=github.com/mon-entreprise/*
```

Git doit ensuite être configuré pour s'authentifier (clé SSH ou jeton).

## Vendoring {#vendor}

`go mod vendor` copie toutes les dépendances dans un dossier `vendor/`. La compilation utilise alors ce dossier, sans accès réseau. Pratique pour certains environnements isolés, mais rarement nécessaire grâce au proxy et au cache.
