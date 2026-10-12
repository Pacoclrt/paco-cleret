---
title: Comment lire ce que l'utilisateur tape au clavier ?
category: faq
order: 5
level: débutant
summary: Utiliser bufio.NewScanner(os.Stdin) puis sc.Scan() et sc.Text() pour lire une ligne entière. fmt.Scan existe mais s'arrête au premier espace.
aliases: saisie clavier, lire le clavier, input, entrée utilisateur, demander à l'utilisateur, scanf, scanln, fmt.scan, readline, stdin, lire une ligne, prompt, question à l'utilisateur, console, interactif
related: ligne-de-commande, fmt, faq-lire-fichier-lignes, conversions
questions:
  - Comment lire une saisie utilisateur en Go ?
  - Comment lire une ligne entière avec des espaces ? -> ligne
  - Comment lire un nombre tapé par l'utilisateur ? -> nombre
  - Pourquoi fmt.Scan s'arrête au premier espace ? -> fmt-scan
---

@@ rapide

```go
sc := bufio.NewScanner(os.Stdin)

fmt.Print("Votre nom : ")
sc.Scan()
nom := sc.Text() // toute la ligne, espaces compris

fmt.Print("Votre âge : ")
sc.Scan()
age, err := strconv.Atoi(strings.TrimSpace(sc.Text()))
if err != nil {
	fmt.Println("âge invalide")
	return
}

fmt.Printf("Bonjour %s, %d ans !\n", nom, age)
```

Créez **un seul** scanner pour `os.Stdin` et réutilisez-le pour toutes les questions.

@@ detail

## Lire une ligne entière {#ligne}

`bufio.Scanner` lit jusqu'au retour à la ligne et renvoie le texte **sans** le `\n` :

```go
sc := bufio.NewScanner(os.Stdin)
fmt.Print("> ")
if !sc.Scan() {
	// fin de l'entrée (Ctrl+D / Ctrl+Z) ou erreur
	return
}
phrase := sc.Text()
```

## Une fonction utilitaire {#utilitaire}

```go
var entree = bufio.NewScanner(os.Stdin)

// Demander affiche une question et renvoie la réponse nettoyée.
func Demander(question string) (string, bool) {
	fmt.Print(question)
	if !entree.Scan() {
		return "", false
	}
	return strings.TrimSpace(entree.Text()), true
}

func main() {
	nom, ok := Demander("Comment vous appelez-vous ? ")
	if !ok {
		return
	}
	fmt.Println("Enchanté,", nom)
}
```

## Lire un nombre {#nombre}

Le texte saisi est toujours une chaîne : convertissez avec `strconv`, et redemandez en cas d'erreur.

```go
func DemanderEntier(question string) int {
	for {
		rep, ok := Demander(question)
		if !ok {
			os.Exit(1)
		}
		n, err := strconv.Atoi(rep)
		if err == nil {
			return n
		}
		fmt.Println("Merci de taper un nombre entier.")
	}
}

age := DemanderEntier("Âge : ")
```

## Une boucle interactive (REPL) {#boucle}

```go
sc := bufio.NewScanner(os.Stdin)
for {
	fmt.Print("commande> ")
	if !sc.Scan() {
		break // Ctrl+D
	}
	switch cmd := strings.TrimSpace(sc.Text()); cmd {
	case "":
		continue
	case "quitter", "exit":
		fmt.Println("Au revoir !")
		return
	case "aide":
		fmt.Println("commandes : aide, heure, quitter")
	case "heure":
		fmt.Println(time.Now().Format("15:04:05"))
	default:
		fmt.Printf("commande inconnue : %q\n", cmd)
	}
}
```

## fmt.Scan et ses limites {#fmt-scan}

```go
var prenom string
var age int
fmt.Print("Prénom et âge : ")
n, err := fmt.Scan(&prenom, &age) // « Ada 36 »
```

`fmt.Scan` lit des éléments **séparés par des espaces** (ou des retours à la ligne) et les convertit directement selon le type de la variable. Pratique pour des entrées simples, mais :

- un nom comme « Ada Lovelace » est coupé en deux ;
- une saisie invalide laisse le reste de la ligne dans le tampon, ce qui fausse les lectures suivantes ;
- `fmt.Scanln` s'arrête à la fin de la ligne, `fmt.Scanf` utilise un format.

Pour tout programme interactif un peu sérieux, préférez `bufio.Scanner`.

## Fonctionne aussi avec un pipe {#pipe}

Le même code lit indifféremment le clavier ou des données redirigées :

```bash
echo "Ada" | go run .
go run . < reponses.txt
```

Voir [[ligne-de-commande#stdin]].
