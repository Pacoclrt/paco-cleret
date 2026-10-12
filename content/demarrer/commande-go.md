---
title: La commande go
category: demarrer
order: 4
level: débutant
summary: L'outil go fait tout : compiler (build), exécuter (run), formater (fmt), vérifier (vet), tester (test) et gérer les dépendances (mod, get).
aliases: go run, go build, go fmt, gofmt, go vet, go test, go get, go install, go mod, go doc, go env, outil go, cli, compiler, compilation, exécuter, cross compilation, goos, goarch
related: modules, tests, conventions, installation
questions:
  - Quelles sont les commandes go à connaître ?
  - Quelle différence entre go run et go build ? -> run-build
  - Comment compiler pour Windows depuis Linux ou Mac ? -> cross-compilation
  - Comment formater automatiquement mon code ? -> fmt-vet
  - Comment voir la documentation d'un package ? -> doc
---

@@ rapide

Une seule commande, `go`, regroupe tout l'outillage :

| Commande | Rôle |
|---|---|
| `go run .` | Compiler et exécuter |
| `go build` | Compiler en exécutable |
| `go fmt ./...` | Formater le code |
| `go vet ./...` | Détecter les erreurs probables |
| `go test ./...` | Lancer les tests |
| `go mod init nom` | Créer un module |
| `go mod tidy` | Nettoyer les dépendances |
| `go get pkg@v1.2.3` | Ajouter ou mettre à jour une dépendance |
| `go install pkg@latest` | Installer un outil |
| `go doc strings.Split` | Lire la documentation |

Le motif `./...` signifie « ce dossier **et tous ses sous-dossiers** ».

@@ detail

## go run et go build {#run-build}

`go run` compile le programme dans un dossier temporaire puis l'exécute. Rien n'est laissé sur le disque. Idéal pour tester rapidement.

```bash
go run .              # le package main du dossier courant
go run ./cmd/serveur  # un autre package main
go run . arg1 arg2    # avec des arguments pour le programme
```

`go build` produit un **exécutable** que vous pouvez distribuer :

```bash
go build                   # exécutable nommé d'après le module/dossier
go build -o bin/app .      # nom et emplacement personnalisés
go build -ldflags="-s -w"  # binaire plus léger (sans infos de débogage)
```

Sur un package qui n'est pas `main`, `go build` vérifie simplement que tout compile.

## Compiler pour un autre système {#cross-compilation}

La **compilation croisée** est un point fort de Go : il suffit de définir deux variables d'environnement.

```bash
GOOS=windows GOARCH=amd64 go build -o app.exe .
GOOS=linux   GOARCH=arm64 go build -o app-linux .
GOOS=darwin  GOARCH=arm64 go build -o app-mac .
```

La liste complète des combinaisons possibles s'obtient avec `go tool dist list`.

:::tip CGO_ENABLED=0
Pour un binaire 100 % statique (pratique dans un conteneur Docker minimal), ajoutez `CGO_ENABLED=0`.
:::

## go fmt et go vet {#fmt-vet}

`go fmt` reformate le code selon **le** style officiel (il appelle `gofmt -l -w`). Personne ne débat de l'indentation en Go : c'est l'outil qui décide.

```bash
go fmt ./...
gofmt -d main.go   # affiche les différences sans modifier
```

`go vet` analyse le code et signale les **erreurs probables** que le compilateur laisse passer :

```go
fmt.Printf("%d\n", "texte") // vet : %d attend un entier, reçoit une string
```

Il détecte aussi les mutex copiés, les `return` impossibles à atteindre, les mauvais tags de struct, etc. Lancez-le systématiquement (il est d'ailleurs exécuté automatiquement en partie par `go test`).

## go test {#test}

```bash
go test ./...            # tous les tests du module
go test -v ./...         # en mode verbeux
go test -run TestSomme   # seulement les tests correspondant au motif
go test -race ./...      # avec le détecteur de data races
go test -cover ./...     # avec la couverture de code
go test -bench . ./...   # avec les benchmarks
```

Tout est expliqué dans [[tests]].

## Gérer les dépendances : go mod et go get {#mod-get}

| Commande | Effet |
|---|---|
| `go mod init exemple.com/app` | Crée `go.mod` |
| `go get github.com/google/uuid` | Ajoute la dernière version d'une dépendance |
| `go get github.com/google/uuid@v1.6.0` | Version précise |
| `go get -u ./...` | Met à jour toutes les dépendances |
| `go get pkg@none` | Retire une dépendance |
| `go mod tidy` | Ajoute ce qui manque, retire ce qui ne sert plus |
| `go mod download` | Télécharge les dépendances dans le cache |
| `go mod vendor` | Copie les dépendances dans `vendor/` |
| `go list -m all` | Liste toutes les dépendances |

Voir [[modules]].

## go install {#install}

`go install` compile un programme et place l'exécutable dans `~/go/bin` (ou `$GOBIN`). C'est la manière standard d'installer des outils écrits en Go :

```bash
go install golang.org/x/tools/gopls@latest
go install honnef.co/go/tools/cmd/staticcheck@latest
```

## go doc {#doc}

Consultez la documentation sans quitter le terminal :

```bash
go doc fmt              # résumé du package
go doc fmt.Printf       # une fonction
go doc -all strings     # tout le package
go doc json.Decoder.Decode
```

La documentation complète et illustrée de tous les packages publics est aussi sur [pkg.go.dev](https://pkg.go.dev).

## Autres commandes utiles {#autres}

| Commande | Rôle |
|---|---|
| `go version` | Version de Go installée |
| `go env` | Variables de configuration (`GOPATH`, `GOOS`…) |
| `go env -w GOPRIVATE=github.com/monorg/*` | Modifie une variable de façon persistante |
| `go clean -modcache` | Vide le cache des modules |
| `go generate ./...` | Exécute les directives `//go:generate` |
| `go work init` | Crée un espace de travail multi-modules |
| `go tool pprof` | Analyse un profil de performance |
| `go help <commande>` | Aide détaillée sur une commande |
