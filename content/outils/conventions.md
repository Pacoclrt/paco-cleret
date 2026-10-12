---
title: Conventions et style idiomatique
category: outils
order: 2
level: intermédiaire
summary: Le code Go idiomatique est formaté par gofmt, utilise des noms courts en MixedCaps, gère les erreurs explicitement avec des retours anticipés, et privilégie la simplicité. go vet et staticcheck détectent les erreurs courantes.
aliases: convention, conventions, style, idiomatique, bonnes pratiques, best practices, nommage, naming, nom de variable, camelcase, mixedcaps, gofmt, goimports, go vet, staticcheck, golangci-lint, linter, lint, effective go, proverbes go, go proverbs, commentaire de documentation, godoc, revue de code, clean code
related: commande-go, packages, erreurs, tests, variables
questions:
  - Quelles sont les conventions de nommage en Go ?
  - Comment écrire du code Go idiomatique ? -> principes
  - Quels outils utiliser pour analyser mon code (linter) ? -> outils
  - Comment documenter mon code ? -> documentation
  - Que sont les proverbes Go ? -> proverbes
---

@@ rapide

- **Formatage** : laissez `gofmt` (ou votre éditeur) formater. Jamais de débat sur le style.
- **Nommage** : `MixedCaps` (jamais d'underscore), Majuscule = exporté, noms **courts** pour une portée courte (`i`, `r`, `err`), acronymes en majuscules (`userID`, `ServeHTTP`).
- **Packages** : nom court, en minuscules, d'un seul mot (`strconv`, `http`), sans `utils` ni `common`.
- **Erreurs** : vérifiées immédiatement, enveloppées avec du contexte, messages en minuscules.
- **Retour anticipé** : gérez les cas d'erreur d'abord, gardez le chemin normal aligné à gauche.
- **Outils** : `go vet` systématiquement, `staticcheck` ou `golangci-lint` en complément.

```go
// ✅ Idiomatique
func (s *Store) User(ctx context.Context, id int) (*User, error) {
	u, err := s.db.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user %d : %w", id, err)
	}
	return u, nil
}
```

@@ detail

## Le formatage {#formatage}

`gofmt` impose **un** style : tabulations pour l'indentation, accolades sur la même ligne, alignement des commentaires et des champs. Tout le monde l'utilise, donc tout le code Go se ressemble.

```bash
gofmt -l .        # liste les fichiers mal formatés
gofmt -w .        # les corrige
go fmt ./...      # idem, pour les packages
goimports -w .    # gofmt + ajoute/supprime les imports automatiquement
```

Configurez votre éditeur pour formater **à chaque enregistrement**.

## Le nommage {#nommage}

| Élément | Convention | Exemples |
|---|---|---|
| Variables, fonctions | `camelCase` (privé) / `PascalCase` (exporté) | `compteur`, `NewServer` |
| Constantes | comme les variables (pas de `MAJUSCULES_SNAKE`) | `MaxTentatives`, `defaultPort` |
| Packages | minuscules, un mot, pas d'underscore | `httputil`, `strconv` |
| Interfaces à une méthode | méthode + `-er` | `Reader`, `Stringer`, `Notifier` |
| Receivers | 1 à 3 lettres, cohérent | `func (s *Server)`, `func (c Client)` |
| Acronymes | casse uniforme | `URL`, `userID`, `HTTPClient`, `xmlParser` |
| Getters | sans `Get` | `Owner()`, `SetOwner()` |
| Erreurs | `Err…` (variables), `…Error` (types) | `ErrNotFound`, `PathError` |

La **longueur** d'un nom doit être proportionnelle à sa **portée** : `i` dans une boucle de trois lignes, `nombreDeTentativesMaximum` éventuellement pour une variable de package.

### Éviter la répétition (stutter)

Le nom du package fait partie de l'appel. Ne le répétez pas :

```go
// Dans le package user
func NewUser() *User // ❌ appelé user.NewUser()
func New() *User     // ✅ appelé user.New()

type UserService struct{} // ❌ user.UserService
type Service struct{}     // ✅ user.Service
```

C'est pour cela que la bibliothèque standard a `http.Server` (et non `http.HTTPServer`) ou `bytes.Buffer`.

## Les principes {#principes}

### Gérer les erreurs explicitement

Vérifiez chaque erreur juste après l'appel, ajoutez du contexte, et ne la traitez qu'une fois (voir [[erreurs]]).

### Retour anticipé

```go
// ❌ Imbrication
if err == nil {
	if valide {
		// traitement
	}
}

// ✅ Clauses de garde
if err != nil {
	return err
}
if !valide {
	return ErrInvalide
}
// traitement, aligné à gauche
```

### Une valeur zéro utile

Concevez vos types pour qu'ils soient utilisables sans initialisation (`var b bytes.Buffer`, `var mu sync.Mutex`).

### Accepter des interfaces, renvoyer des types concrets

Voir [[interfaces#accepter-interfaces]].

### Des interfaces petites, définies par le consommateur

Une ou deux méthodes, déclarées là où elles sont utilisées.

### Le contexte en premier paramètre

`func Faire(ctx context.Context, …)`, jamais stocké dans une struct (voir [[context]]).

### Pas de panic pour les erreurs normales

Voir [[panic-recover#quand-panic]].

### La simplicité avant tout

Pas d'abstraction prématurée, pas de couches inutiles. Un peu de duplication vaut mieux qu'une mauvaise abstraction.

## La documentation {#documentation}

Chaque élément **exporté** devrait avoir un commentaire qui commence par **son nom** :

```go
// Package calcul fournit des fonctions arithmétiques simples.
package calcul

// MaxIterations est le nombre maximal d'itérations de Racine.
const MaxIterations = 100

// Racine renvoie la racine carrée de x par la méthode de Newton.
// Elle renvoie une erreur si x est négatif.
func Racine(x float64) (float64, error) {
	// …
}
```

Ces commentaires sont affichés par `go doc` et sur [pkg.go.dev](https://pkg.go.dev). Depuis Go 1.19, ils acceptent une syntaxe simple : listes, liens `[strings.Builder]`, blocs de code indentés.

## Les commentaires dans le code {#commentaires}

- Expliquez le **pourquoi**, pas le **quoi** (le code dit déjà ce qu'il fait).
- Phrases complètes, avec majuscule et point.
- `// TODO(paco): …` pour signaler un travail à faire.

## Les outils d'analyse {#outils}

| Outil | Rôle |
|---|---|
| `go vet` | erreurs probables : `Printf` mal formé, mutex copié, code inaccessible… |
| `staticcheck` | analyse statique avancée : bugs, code mort, simplifications, API obsolètes |
| `golangci-lint` | lance des dizaines de linters d'un coup, configurable |
| `govulncheck` | vulnérabilités connues dans vos dépendances |
| `go test -race` | data races à l'exécution |
| `gopls` | serveur de langage : diagnostics directement dans l'éditeur |

```bash
go vet ./...
go install honnef.co/go/tools/cmd/staticcheck@latest && staticcheck ./...
go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./...
```

## Les proverbes Go {#proverbes}

Quelques maximes de Rob Pike qui résument la philosophie du langage (traduites librement) :

- Ne communiquez pas en partageant la mémoire ; partagez la mémoire en communiquant.
- La concurrence n'est pas le parallélisme.
- Plus l'interface est grande, plus l'abstraction est faible.
- Rendez la valeur zéro utile.
- `interface{}` ne dit rien.
- Le style de gofmt n'est le préféré de personne, mais gofmt est le préféré de tout le monde.
- Un peu de copie vaut mieux qu'un peu de dépendance.
- Clair vaut mieux qu'astucieux.
- Les erreurs sont des valeurs.
- Ne vous contentez pas de vérifier les erreurs, traitez-les avec élégance.
- Documentez pour les utilisateurs.
- Ne paniquez pas.

## Pour aller plus loin {#ressources}

- [Effective Go](https://go.dev/doc/effective_go) : le guide de style historique.
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments) : les remarques fréquentes en revue de code.
- [Google Go Style Guide](https://google.github.io/styleguide/go/) : un guide très complet.
- [go.dev/doc](https://go.dev/doc/) : la documentation officielle.
