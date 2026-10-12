---
title: Qu'est-ce que Go ?
category: demarrer
order: 1
level: débutant
summary: Go (ou Golang) est un langage compilé, typé statiquement et volontairement simple, créé chez Google pour écrire des logiciels fiables, rapides et faciles à maintenir.
aliases: go, golang, langage go, présentation, introduction, pourquoi go, histoire de go, c'est quoi go
related: installation, premier-programme, aide-memoire
questions:
  - Qu'est-ce que le langage Go ?
  - Pourquoi apprendre Go ? -> pourquoi-go
  - Quelle est la différence entre Go et Golang ? -> go-ou-golang
  - À quoi sert Go concrètement ? -> usages
  - Go est-il un langage orienté objet ? -> ce-que-go-na-pas
---

@@ rapide

**Go** est un langage de programmation **open source** conçu chez Google à partir de 2007 par Robert Griesemer, Rob Pike et Ken Thompson. La version 1.0 est sortie en 2012. Go est :

- **compilé** : votre code devient un exécutable natif, rapide et autonome ;
- **typé statiquement** : les erreurs de type sont détectées avant l'exécution ;
- **simple** : seulement 25 mots-clés et une seule boucle (`for`) ;
- **concurrent** : les *goroutines* et les *channels* rendent le parallélisme accessible ;
- **bien outillé** : formatage, tests, documentation et dépendances sont intégrés à la commande `go`.

```go title=main.go
package main

import "fmt"

func main() {
	fmt.Println("Bonjour, Go !")
}
```

On l'utilise surtout pour les **API et serveurs web**, les **outils en ligne de commande**, le **cloud** (Docker et Kubernetes sont écrits en Go) et les **microservices**.

@@ detail

## Une brève histoire {#histoire}

En 2007, trois ingénieurs de Google en ont assez des temps de compilation interminables du C++ et de la complexité croissante des langages qu'ils utilisent. Ils imaginent un langage qui combinerait :

- la **performance** et la sûreté d'un langage compilé et typé comme le C ou le Java ;
- la **simplicité d'écriture** d'un langage de script comme Python ;
- une gestion **native de la concurrence**, pensée pour les processeurs multicœurs et les serveurs réseau.

Go est présenté publiquement en novembre 2009. La **version 1.0** sort en mars 2012 avec une promesse forte : la **compatibilité Go 1**. Un programme écrit pour Go 1.0 doit continuer à compiler avec les versions suivantes. Cette promesse a été tenue, ce qui explique la stabilité de l'écosystème.

Depuis, une nouvelle version sort environ **tous les six mois** (en février et en août). Parmi les évolutions marquantes : les modules (Go 1.11), les génériques (Go 1.18), les fonctions `min`, `max` et `clear` (Go 1.21), une variable de boucle neuve à chaque itération (Go 1.22) et les itérateurs (Go 1.23).

## Les principes de conception {#principes}

Go est guidé par quelques idées fortes, qui expliquent beaucoup de ses choix :

| Principe | Ce que ça veut dire concrètement |
|---|---|
| **Simplicité** | Peu de mots-clés, peu de façons différentes d'écrire la même chose. |
| **Lisibilité** | Le code est lu bien plus souvent qu'il n'est écrit. `gofmt` impose un style unique. |
| **Composition** | Pas d'héritage : on assemble des petits morceaux (structs, interfaces). |
| **Explicite** | Pas d'exceptions cachées : les erreurs sont des valeurs qu'on retourne et qu'on vérifie. |
| **Compilation rapide** | Même un gros projet compile en quelques secondes. |
| **Concurrence intégrée** | Le mot-clé `go` lance une tâche concurrente en une ligne. |

:::info Un langage « ennuyeux », et c'est voulu
On dit souvent que Go est « ennuyeux ». C'est un compliment : un code Go écrit par quelqu'un d'autre se lit facilement, même des années plus tard.
:::

## Pourquoi apprendre Go ? {#pourquoi-go}

- **Courbe d'apprentissage douce** : on peut lire et écrire du Go utile en quelques jours.
- **Performances** : bien plus rapide que Python ou JavaScript, et proche de Java ou C# sur de nombreux usages.
- **Déploiement trivial** : un seul fichier binaire, sans machine virtuelle ni interpréteur à installer. On peut même compiler pour Windows depuis un Mac (`GOOS=windows go build`).
- **Concurrence facile** : lancer des milliers de tâches concurrentes est naturel.
- **Bibliothèque standard très riche** : serveur HTTP, JSON, cryptographie, tests… sans dépendance externe.
- **Marché de l'emploi** : Go est très demandé dans le cloud, le DevOps, la fintech et le back-end.

## À quoi sert Go concrètement ? {#usages}

| Domaine | Exemples réels |
|---|---|
| Cloud et conteneurs | Docker, Kubernetes, containerd |
| Infrastructure | Terraform, Consul, Vault, Prometheus, Grafana (back-end) |
| Outils en ligne de commande | GitHub CLI (`gh`), Hugo, fzf |
| Bases de données | CockroachDB, InfluxDB, etcd |
| API et microservices | Uber, Twitch, Dropbox, Cloudflare… |

Go est en revanche moins adapté aux interfaces graphiques de bureau, au développement mobile natif ou à la science des données (où Python domine).

## Go ou Golang ? {#go-ou-golang}

Le nom officiel du langage est **Go**. « Golang » vient de l'ancien nom de domaine du site officiel, `golang.org` (le site est aujourd'hui [go.dev](https://go.dev)). On utilise « golang » surtout dans les recherches web, car « go » est un mot trop courant. Les deux désignent exactement la même chose.

## Ce que Go n'a pas (volontairement) {#ce-que-go-na-pas}

Si vous venez d'un autre langage, certaines absences vont vous surprendre. Elles sont toutes **délibérées** :

| Absent en Go | Ce qu'on utilise à la place |
|---|---|
| Classes et héritage | [[structs]], [[methodes]], [[embedding]] et [[interfaces]] |
| Exceptions (`try`/`catch`) | Valeurs [[erreurs|error]] retournées, et [[panic-recover]] pour l'exceptionnel |
| Boucle `while` | `for condition { }` (voir [[for]]) |
| Opérateur ternaire `a ? b : c` | Un simple `if`/`else` |
| Surcharge de fonctions | Des noms différents, ou les [[generiques]] |
| Paramètres par défaut | Une struct d'options ou des fonctions variadiques |
| Conversions implicites | Des [[conversions]] toujours explicites : `float64(n)` |

Go est donc **orienté objet à sa manière** : on a des types, des méthodes et du polymorphisme via les interfaces, mais pas de hiérarchie de classes. Voir [[faq-heritage]].

## Comment est organisée cette documentation {#cette-documentation}

Chaque page contient deux niveaux de lecture :

- **Explication rapide** : l'essentiel en quelques lignes et un exemple, pour comprendre ou se rafraîchir la mémoire en 30 secondes.
- **Explication détaillée** : le fonctionnement complet, les cas particuliers, les pièges et les bonnes pratiques.

Pour bien démarrer, suivez l'ordre du menu : [[installation]], puis [[premier-programme]], puis la catégorie « Les bases ». Et si vous cherchez quelque chose de précis, utilisez la **recherche** (raccourci `Ctrl` + `K`) : elle comprend aussi les questions, comme « comment lire un fichier ? ».
