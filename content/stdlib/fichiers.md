---
title: Lire et écrire des fichiers
category: stdlib
order: 2
level: débutant
summary: os.ReadFile et os.WriteFile lisent ou écrivent un fichier entier en une ligne. Pour les gros fichiers ou le ligne par ligne, on ouvre le fichier (os.Open, os.Create) et on utilise bufio. Toujours fermer avec defer f.Close().
aliases: fichier, fichiers, file, files, lire un fichier, écrire un fichier, os.readfile, os.writefile, os.open, os.create, os.openfile, bufio, scanner, ligne par ligne, ajouter à un fichier, append, dossier, répertoire, directory, mkdir, readdir, filepath, chemin, path, existe, os.stat, supprimer un fichier, io.copy, embed, go:embed
related: ligne-de-commande, faq-lire-fichier-lignes, defer, erreurs, json
questions:
  - Comment lire un fichier en Go ?
  - Comment écrire dans un fichier ? -> ecrire
  - Comment lire un fichier ligne par ligne ? -> ligne-par-ligne
  - Comment ajouter du texte à la fin d'un fichier ? -> ajouter
  - Comment vérifier si un fichier existe ? -> existe
  - Comment lister les fichiers d'un dossier ? -> dossiers
  - Comment créer un dossier ? -> dossiers
  - Comment construire un chemin de fichier portable ? -> chemins
  - Comment inclure des fichiers dans l'exécutable ? -> embed
---

@@ rapide

```go
// Lire tout un fichier
data, err := os.ReadFile("notes.txt")
if err != nil {
	log.Fatal(err)
}
fmt.Println(string(data))

// Écrire (crée ou écrase) avec les permissions rw-r--r--
err = os.WriteFile("sortie.txt", []byte("Bonjour\n"), 0o644)

// Lire ligne par ligne (gros fichiers)
f, err := os.Open("journal.log")
if err != nil {
	log.Fatal(err)
}
defer f.Close()

sc := bufio.NewScanner(f)
for sc.Scan() {
	fmt.Println(sc.Text())
}
if err := sc.Err(); err != nil {
	log.Fatal(err)
}
```

Vérifiez **toujours** l'erreur, fermez avec **`defer f.Close()`**, et utilisez `filepath.Join` pour construire des chemins.

@@ detail

## Lire un fichier entier {#lire}

```go
data, err := os.ReadFile("config.json") // []byte
if err != nil {
	return fmt.Errorf("lecture config : %w", err)
}
contenu := string(data)
```

Simple et efficace pour les fichiers de taille raisonnable (quelques Mo). Le fichier est ouvert, lu et fermé automatiquement.

## Écrire un fichier {#ecrire}

```go
texte := "ligne 1\nligne 2\n"
if err := os.WriteFile("sortie.txt", []byte(texte), 0o644); err != nil {
	log.Fatal(err)
}
```

`os.WriteFile` **crée** le fichier s'il n'existe pas et l'**écrase** sinon. Le dernier argument est la **permission** Unix du fichier créé :

| Permission | Signification |
|---|---|
| `0o644` | propriétaire : lecture/écriture ; autres : lecture (cas courant) |
| `0o600` | propriétaire seulement (fichiers sensibles) |
| `0o755` | exécutable / dossier accessible |

Pour écrire progressivement, ouvrez le fichier et utilisez un `bufio.Writer` :

```go
f, err := os.Create("rapport.txt") // crée ou tronque
if err != nil {
	return err
}
defer f.Close()

w := bufio.NewWriter(f)
for i := range 1000 {
	fmt.Fprintf(w, "ligne %d\n", i)
}
if err := w.Flush(); err != nil { // ⚠️ indispensable : vide le tampon sur le disque
	return err
}
```

## Ajouter à la fin d'un fichier {#ajouter}

`os.OpenFile` permet de choisir précisément le mode d'ouverture :

```go
f, err := os.OpenFile("app.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
if err != nil {
	log.Fatal(err)
}
defer f.Close()

if _, err := f.WriteString("nouvel événement\n"); err != nil {
	log.Fatal(err)
}
```

| Drapeau | Effet |
|---|---|
| `os.O_RDONLY` / `O_WRONLY` / `O_RDWR` | lecture seule / écriture seule / les deux |
| `os.O_APPEND` | écrire à la fin |
| `os.O_CREATE` | créer s'il n'existe pas |
| `os.O_TRUNC` | vider le fichier à l'ouverture |
| `os.O_EXCL` | avec `O_CREATE` : échouer si le fichier existe |

`os.Open(nom)` équivaut à `OpenFile(nom, O_RDONLY, 0)` et `os.Create(nom)` à `OpenFile(nom, O_RDWR|O_CREATE|O_TRUNC, 0o666)`.

## Lire ligne par ligne {#ligne-par-ligne}

```go
f, err := os.Open("donnees.csv")
if err != nil {
	return err
}
defer f.Close()

sc := bufio.NewScanner(f)
numero := 0
for sc.Scan() {
	numero++
	ligne := sc.Text() // sans le « \n » final
	fmt.Printf("%d: %s\n", numero, ligne)
}
return sc.Err() // erreur éventuelle de lecture (pas io.EOF)
```

Par défaut, `Scanner` refuse les lignes de plus de **64 Ko** (`bufio.Scanner: token too long`). Pour de très longues lignes, agrandissez le tampon :

```go
sc.Buffer(make([]byte, 0, 1024*1024), 10*1024*1024) // jusqu'à 10 Mo par ligne
```

On peut aussi découper en **mots** : `sc.Split(bufio.ScanWords)`. Plus d'exemples dans [[faq-lire-fichier-lignes]].

## Les interfaces io.Reader et io.Writer {#io}

Un `*os.File` est à la fois un `io.Reader` et un `io.Writer`. On peut donc le brancher sur toutes les fonctions qui acceptent ces interfaces :

```go
// Copier un fichier
src, _ := os.Open("a.bin")
defer src.Close()
dst, _ := os.Create("b.bin")
defer dst.Close()
n, err := io.Copy(dst, src) // copie en flux, sans tout charger en mémoire

// Lire tout un Reader
contenu, err := io.ReadAll(src)
```

## Vérifier si un fichier existe {#existe}

```go
info, err := os.Stat("config.json")
switch {
case err == nil:
	fmt.Println("existe, taille :", info.Size(), "octets, dossier :", info.IsDir())
case errors.Is(err, fs.ErrNotExist):
	fmt.Println("n'existe pas")
default:
	fmt.Println("impossible de savoir :", err) // permission refusée, etc.
}
```

:::tip Essayez plutôt que vérifier
Vérifier puis ouvrir laisse une fenêtre où le fichier peut disparaître. Le plus souvent, ouvrez directement et traitez l'erreur `fs.ErrNotExist`.
:::

## Dossiers {#dossiers}

```go
os.Mkdir("sortie", 0o755)               // crée un dossier (échoue si le parent n'existe pas)
os.MkdirAll("data/2024/janvier", 0o755) // crée toute l'arborescence
os.Remove("vieux.txt")                  // supprime un fichier ou un dossier vide
os.RemoveAll("tmp")                     // supprime récursivement (prudence !)
os.Rename("a.txt", "b.txt")             // renomme ou déplace

entrees, err := os.ReadDir(".") // liste un dossier, triée par nom
for _, e := range entrees {
	fmt.Println(e.Name(), e.IsDir())
}
```

Parcourir **récursivement** une arborescence :

```go
err := filepath.WalkDir(".", func(chemin string, d fs.DirEntry, err error) error {
	if err != nil {
		return err
	}
	if d.IsDir() && d.Name() == ".git" {
		return filepath.SkipDir // ne pas descendre dans .git
	}
	if filepath.Ext(chemin) == ".go" {
		fmt.Println(chemin)
	}
	return nil
})
```

Fichiers et dossiers temporaires : `os.CreateTemp("", "prefixe-*.txt")` et `os.MkdirTemp("", "travail")`.

## Chemins portables {#chemins}

Windows utilise `\`, Linux et macOS `/`. Le package `path/filepath` s'adapte au système :

```go
p := filepath.Join("data", "2024", "notes.txt") // data/2024/notes.txt ou data\2024\notes.txt
filepath.Base("/a/b/photo.jpg")                 // "photo.jpg"
filepath.Dir("/a/b/photo.jpg")                  // "/a/b"
filepath.Ext("photo.jpg")                       // ".jpg"
filepath.Abs("notes.txt")                       // chemin absolu
matches, _ := filepath.Glob("*.log")            // fichiers correspondant à un motif
```

Le package `path` (sans `file`) est réservé aux chemins avec des `/`, comme les URL.

## Inclure des fichiers dans l'exécutable : embed {#embed}

La directive `//go:embed` intègre des fichiers **dans le binaire** à la compilation. Pratique pour distribuer un seul fichier qui contient ses modèles HTML, ses fichiers statiques ou sa configuration par défaut :

```go
import "embed"

//go:embed version.txt
var version string

//go:embed static/*
var static embed.FS

func main() {
	fmt.Println("version", version)
	http.Handle("/static/", http.FileServerFS(static))
}
```

## Formats courants {#formats}

| Format | Package |
|---|---|
| JSON | `encoding/json` (voir [[json]]) |
| CSV | `encoding/csv` |
| XML | `encoding/xml` |
| Archives | `archive/zip`, `archive/tar`, `compress/gzip` |

```go
r := csv.NewReader(f)
lignes, err := r.ReadAll() // [][]string
```
