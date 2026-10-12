---
title: Comment lire un fichier ligne par ligne ?
category: faq
order: 4
level: débutant
summary: Ouvrir le fichier avec os.Open, créer un bufio.Scanner, boucler avec sc.Scan() et lire chaque ligne avec sc.Text(). Vérifier sc.Err() à la fin et fermer le fichier avec defer.
aliases: lire un fichier ligne par ligne, lire ligne par ligne, readline, read line, bufio.scanner, scanner, lire les lignes, parcourir un fichier, lire un gros fichier, compter les lignes, token too long
related: fichiers, faq-saisie-clavier, defer, package-strings
questions:
  - Comment lire un fichier ligne par ligne en Go ?
  - Comment lire un très gros fichier sans tout charger en mémoire ? -> gros-fichiers
  - Que faire en cas d'erreur « bufio.Scanner token too long » ? -> lignes-longues
  - Comment lire un fichier mot par mot ? -> mots
---

@@ rapide

```go
f, err := os.Open("fichier.txt")
if err != nil {
	log.Fatal(err)
}
defer f.Close()

sc := bufio.NewScanner(f)
for sc.Scan() {
	ligne := sc.Text() // la ligne, sans le « \n »
	fmt.Println(ligne)
}
if err := sc.Err(); err != nil {
	log.Fatal(err)
}
```

Le fichier est lu **au fur et à mesure** : même un fichier de plusieurs Go ne charge qu'une ligne à la fois en mémoire.

@@ detail

## Exemple complet {#exemple}

Compter les lignes non vides et trouver la plus longue :

```go title=main.go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"unicode/utf8"
)

func main() {
	f, err := os.Open("poeme.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	var (
		numero, nonVides int
		plusLongue       string
	)

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		numero++
		ligne := strings.TrimSpace(sc.Text())
		if ligne == "" {
			continue
		}
		nonVides++
		if utf8.RuneCountInString(ligne) > utf8.RuneCountInString(plusLongue) {
			plusLongue = ligne
		}
	}
	if err := sc.Err(); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%d lignes, dont %d non vides\n", numero, nonVides)
	fmt.Printf("la plus longue : %q\n", plusLongue)
}
```

Points importants :

- `sc.Scan()` renvoie `false` à la fin du fichier **ou** en cas d'erreur : vérifiez `sc.Err()` après la boucle (il vaut `nil` en fin de fichier normale).
- `sc.Text()` renvoie la ligne **sans** le `\n` (ni le `\r` des fichiers Windows).
- `sc.Bytes()` évite une allocation, mais le contenu est écrasé au `Scan` suivant.

## Les lignes très longues {#lignes-longues}

Par défaut, une ligne ne peut pas dépasser **64 Ko**. Au-delà, `Scan` s'arrête et `sc.Err()` renvoie `bufio.Scanner: token too long`. Agrandissez le tampon :

```go
sc := bufio.NewScanner(f)
sc.Buffer(make([]byte, 0, 64*1024), 10*1024*1024) // lignes jusqu'à 10 Mo
```

Alternative sans limite : `bufio.Reader.ReadString('\n')`.

```go
r := bufio.NewReader(f)
for {
	ligne, err := r.ReadString('\n') // inclut le « \n »
	if len(ligne) > 0 {
		fmt.Print(ligne)
	}
	if err == io.EOF {
		break
	}
	if err != nil {
		log.Fatal(err)
	}
}
```

## Lire mot par mot ou caractère par caractère {#mots}

```go
sc := bufio.NewScanner(f)
sc.Split(bufio.ScanWords) // ou ScanRunes, ScanBytes, ScanLines (défaut)
compte := map[string]int{}
for sc.Scan() {
	compte[strings.ToLower(sc.Text())]++
}
```

## Gros fichiers {#gros-fichiers}

| Méthode | Mémoire | Quand l'utiliser |
|---|---|---|
| `os.ReadFile` + `strings.Split` | tout le fichier | petits fichiers (< quelques Mo) |
| `bufio.Scanner` | une ligne | cas général, ligne par ligne |
| `bufio.Reader` | un tampon | lignes de longueur arbitraire, lecture fine |
| `io.Copy` | un tampon | recopier sans analyser |

Pour un petit fichier, la version courte est acceptable :

```go
data, err := os.ReadFile("liste.txt")
if err != nil {
	log.Fatal(err)
}
for ligne := range strings.Lines(string(data)) { // Go 1.24+
	fmt.Print(ligne)
}
```

## Lire depuis n'importe quelle source {#source}

`bufio.NewScanner` accepte tout `io.Reader` : un fichier, `os.Stdin`, le corps d'une réponse HTTP, ou une chaîne (`strings.NewReader`). Écrivez donc vos fonctions avec un `io.Reader` en paramètre, elles seront faciles à tester :

```go
func CompterLignes(r io.Reader) (int, error) {
	sc := bufio.NewScanner(r)
	n := 0
	for sc.Scan() {
		n++
	}
	return n, sc.Err()
}

n, _ := CompterLignes(strings.NewReader("a\nb\nc")) // 3
```

Voir aussi [[fichiers]] et [[faq-saisie-clavier]].
