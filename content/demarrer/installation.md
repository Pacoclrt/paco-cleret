---
title: Installer Go
category: demarrer
order: 2
level: débutant
summary: Télécharger Go sur go.dev/dl, l'installer, vérifier avec « go version » et configurer son éditeur.
aliases: installation, installer go, télécharger go, setup, configuration, path, gopath, goroot, vscode, éditeur, ide, homebrew
related: premier-programme, commande-go, modules
questions:
  - Comment installer Go ?
  - Comment installer Go sur Windows ? -> windows
  - Comment installer Go sur Mac ? -> macos
  - Comment installer Go sur Linux ? -> linux
  - Qu'est-ce que le GOPATH ? -> gopath
  - Quel éditeur utiliser pour coder en Go ? -> editeur
  - Comment mettre à jour Go ? -> mise-a-jour
---

@@ rapide

1. Téléchargez l'installeur pour votre système sur **[go.dev/dl](https://go.dev/dl/)**.
2. Lancez-le (Windows `.msi`, macOS `.pkg`) ou décompressez l'archive dans `/usr/local` (Linux).
3. Ouvrez un **nouveau** terminal et vérifiez :

```bash
go version
```

```output
go version go1.xx.x darwin/arm64
```

4. Installez **VS Code** et son extension officielle **Go** : coloration, autocomplétion, formatage automatique et débogage.

Pas envie d'installer quoi que ce soit ? Testez Go directement dans le navigateur avec le [Go Playground](https://go.dev/play/).

@@ detail

## Windows {#windows}

1. Téléchargez le fichier `.msi` sur [go.dev/dl](https://go.dev/dl/) (choisissez `amd64` pour un PC classique, `arm64` pour un PC ARM).
2. Double-cliquez et suivez l'assistant. Go s'installe par défaut dans `C:\Program Files\Go`.
3. L'installeur ajoute automatiquement Go à la variable `PATH`. **Fermez et rouvrez** votre terminal (PowerShell ou Invite de commandes) pour qu'elle soit prise en compte.
4. Vérifiez avec `go version`.

Avec un gestionnaire de paquets, c'est encore plus simple :

```bash
winget install GoLang.Go
```

## macOS {#macos}

Téléchargez le `.pkg` correspondant à votre processeur (`arm64` pour les puces Apple M1/M2/M3…, `amd64` pour les Mac Intel) et lancez-le. Go est installé dans `/usr/local/go` et ajouté au `PATH`.

Avec [Homebrew](https://brew.sh) :

```bash
brew install go
```

## Linux {#linux}

Supprimez toute installation précédente, puis décompressez l'archive officielle dans `/usr/local` (remplacez le nom de fichier par la version téléchargée) :

```bash
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.xx.x.linux-amd64.tar.gz
```

Ajoutez ensuite Go au `PATH` dans votre `~/.profile` (ou `~/.bashrc`, `~/.zshrc`) :

```bash
export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
```

Rechargez avec `source ~/.profile` puis vérifiez avec `go version`.

:::warning Les paquets des distributions
Les paquets `apt install golang` de certaines distributions proposent des versions anciennes. Préférez l'archive officielle pour avoir une version récente.
:::

## Vérifier l'installation {#verifier}

```bash
go version
go env GOROOT GOPATH GOOS GOARCH
```

- `GOROOT` : là où Go est installé (le compilateur et la bibliothèque standard).
- `GOPATH` : votre espace de travail Go (voir ci-dessous).
- `GOOS` / `GOARCH` : le système et l'architecture cibles par défaut.

## Le GOPATH {#gopath}

Avant les modules (Go 1.11), tout le code devait vivre dans le dossier `GOPATH`. **Ce n'est plus le cas** : vous pouvez créer vos projets n'importe où.

Le `GOPATH` (par défaut `~/go` sous Linux et macOS, `%USERPROFILE%\go` sous Windows) sert encore à deux choses :

| Dossier | Contenu |
|---|---|
| `~/go/pkg/mod` | Le cache des dépendances téléchargées |
| `~/go/bin` | Les programmes installés avec `go install` |

:::tip Ajoutez ~/go/bin au PATH
Les outils installés avec `go install` (comme `gopls` ou `staticcheck`) se retrouvent dans `~/go/bin`. Ajoutez ce dossier à votre `PATH` pour pouvoir les lancer depuis n'importe où.
:::

## Choisir un éditeur {#editeur}

| Éditeur | Points forts |
|---|---|
| **VS Code** + extension « Go » | Gratuit, léger, très populaire. Utilise `gopls`, le serveur de langage officiel. |
| **GoLand** (JetBrains) | IDE complet et puissant, payant (gratuit pour les étudiants). |
| **Neovim / Vim** | Avec `gopls` via LSP, pour les amateurs du terminal. |
| **Zed**, **Sublime Text** | Support de `gopls` également. |

Dans VS Code, après avoir installé l'extension, ouvrez la palette de commandes et lancez **« Go: Install/Update Tools »** pour installer `gopls`, le débogueur `dlv` et les autres outils.

Activez aussi le **formatage à l'enregistrement** : votre code sera automatiquement mis au format standard (`gofmt`) à chaque sauvegarde.

## Mettre à jour Go {#mise-a-jour}

Il suffit d'installer la nouvelle version par-dessus l'ancienne (ou de refaire l'étape Linux). Vos projets ne cassent pas : la compatibilité Go 1 garantit que l'ancien code compile toujours.

Depuis Go 1.21, la directive `go` du fichier `go.mod` peut aussi déclencher le **téléchargement automatique** de la bonne version de la chaîne d'outils (variable `GOTOOLCHAIN`). Si un projet demande `go 1.26` et que vous avez une version plus ancienne, la commande `go` récupère la version nécessaire toute seule.

## Le Go Playground {#playground}

[go.dev/play](https://go.dev/play/) permet d'écrire, d'exécuter et de partager du code Go dans le navigateur. Idéal pour tester un bout de code ou partager un exemple. Limites : pas d'accès au réseau ni aux fichiers, et l'horloge y est fixée (le temps y commence le 10 novembre 2009).

Prochaine étape : [[premier-programme]].
