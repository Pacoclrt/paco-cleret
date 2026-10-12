---
title: Écrire des tests
category: outils
order: 1
level: intermédiaire
summary: Les tests vivent dans des fichiers _test.go, avec des fonctions TestXxx(t *testing.T). On les lance avec go test ./... Le style idiomatique est le test « table-driven » avec des sous-tests t.Run. Benchmarks, exemples, couverture et fuzzing sont intégrés.
aliases: test, tests, tester, testing, test unitaire, tests unitaires, unit test, go test, _test.go, t.error, t.errorf, t.fatal, t.run, sous-test, table driven, table-driven, benchmark, benchmarks, performance, couverture, coverage, cover, fuzz, fuzzing, example, httptest, mock, tdd, assert
related: commande-go, conventions, interfaces, memoire-performance, http
questions:
  - Comment écrire un test en Go ?
  - Comment lancer les tests ? -> lancer
  - Qu'est-ce qu'un test table-driven ? -> table-driven
  - Comment écrire un benchmark ? -> benchmarks
  - Comment mesurer la couverture de code ? -> couverture
  - Quelle différence entre t.Error et t.Fatal ? -> error-fatal
  - Comment tester un handler HTTP ? -> http
---

@@ rapide

```go title=calcul.go
package calcul

func Additionner(a, b int) int { return a + b }
```

```go title=calcul_test.go
package calcul

import "testing"

func TestAdditionner(t *testing.T) {
	tests := []struct {
		nom     string
		a, b    int
		attendu int
	}{
		{"positifs", 2, 3, 5},
		{"négatifs", -2, -3, -5},
		{"zéro", 0, 7, 7},
	}
	for _, tt := range tests {
		t.Run(tt.nom, func(t *testing.T) {
			if got := Additionner(tt.a, tt.b); got != tt.attendu {
				t.Errorf("Additionner(%d, %d) = %d, attendu %d", tt.a, tt.b, got, tt.attendu)
			}
		})
	}
}
```

```bash
go test ./...          # tous les tests
go test -v -run TestAdditionner
go test -cover ./...   # avec la couverture
```

Pas de framework à installer : le package **`testing`** et la commande **`go test`** suffisent.

@@ detail

## Les conventions {#conventions}

- Les fichiers de test se terminent par **`_test.go`** et ne sont compilés que par `go test`.
- Ils sont placés **à côté** du code testé, dans le même dossier.
- Une fonction de test s'appelle **`TestXxx`** (Xxx commence par une majuscule) et reçoit `t *testing.T`.
- Le package peut être le même (`package calcul`, accès aux éléments privés) ou suffixé `_test` (`package calcul_test`, tests « boîte noire » de l'API publique uniquement).

## Signaler un échec : t.Error ou t.Fatal {#error-fatal}

| Méthode | Effet |
|---|---|
| `t.Error(args…)` / `t.Errorf(format, …)` | signale l'échec et **continue** le test |
| `t.Fatal(args…)` / `t.Fatalf(format, …)` | signale l'échec et **arrête** ce test immédiatement |
| `t.Log` / `t.Logf` | message affiché en cas d'échec ou avec `-v` |
| `t.Skip("raison")` | ignore le test |

```go
func TestChargerConfig(t *testing.T) {
	cfg, err := ChargerConfig("testdata/config.json")
	if err != nil {
		t.Fatalf("ChargerConfig : %v", err) // inutile de continuer sans config
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, attendu 8080", cfg.Port)
	}
	if cfg.Hote != "localhost" {
		t.Errorf("Hote = %q, attendu %q", cfg.Hote, "localhost")
	}
}
```

Format idiomatique du message : `Fonction(entrée) = obtenu, attendu valeur`. Go n'a pas de bibliothèque d'assertions intégrée : de simples `if` suffisent (la bibliothèque tierce `testify` est populaire si vous préférez).

## Lancer les tests {#lancer}

```bash
go test                    # package du dossier courant
go test ./...              # tout le module
go test -v ./...           # affiche chaque test
go test -run Additionner   # tests dont le nom correspond (expression régulière)
go test -run 'TestAdd/négatifs' # un sous-test précis
go test -count=1 ./...     # désactive le cache des résultats
go test -race ./...        # détecte les data races
go test -short ./...       # avec testing.Short() pour sauter les tests longs
go test -failfast ./...    # s'arrête au premier échec
```

## Les tests table-driven {#table-driven}

Le style le plus répandu en Go : une **table** de cas, parcourue par une boucle, avec un **sous-test** par cas.

```go
func TestEstPalindrome(t *testing.T) {
	tests := []struct {
		nom    string
		entree string
		veut   bool
	}{
		{"vide", "", true},
		{"une lettre", "a", true},
		{"palindrome", "kayak", true},
		{"pas palindrome", "gopher", false},
		{"avec accents", "été", true},
	}

	for _, tt := range tests {
		t.Run(tt.nom, func(t *testing.T) {
			if got := EstPalindrome(tt.entree); got != tt.veut {
				t.Errorf("EstPalindrome(%q) = %v, attendu %v", tt.entree, got, tt.veut)
			}
		})
	}
}
```

Avantages : ajouter un cas = ajouter une ligne ; chaque cas a un nom ; un échec n'empêche pas les autres de tourner.

## Outils du testing.T {#outils}

```go
func TestAvecFichiers(t *testing.T) {
	t.Parallel() // ce test peut tourner en parallèle des autres tests parallèles

	dir := t.TempDir() // dossier temporaire supprimé automatiquement
	chemin := filepath.Join(dir, "data.txt")

	t.Cleanup(func() { // exécuté à la fin du test
		t.Log("nettoyage")
	})

	t.Setenv("MODE", "test") // variable d'environnement restaurée à la fin

	ctx := t.Context() // contexte annulé à la fin du test (Go 1.24+)
	_ = ctx
	_ = chemin
}

// t.Helper() : en cas d'échec, la ligne signalée est celle de l'appelant
func verifierEgal(t *testing.T, got, veut int) {
	t.Helper()
	if got != veut {
		t.Errorf("obtenu %d, attendu %d", got, veut)
	}
}
```

Le dossier **`testdata/`** est ignoré par la commande `go` : idéal pour les fichiers d'entrée des tests.

## Benchmarks {#benchmarks}

Un benchmark mesure les performances d'une fonction :

```go
func BenchmarkConcatPlus(b *testing.B) {
	for b.Loop() { // Go 1.24+ : la boucle est répétée automatiquement
		s := ""
		for i := range 100 {
			s += strconv.Itoa(i)
		}
	}
}

func BenchmarkConcatBuilder(b *testing.B) {
	for b.Loop() {
		var sb strings.Builder
		for i := range 100 {
			sb.WriteString(strconv.Itoa(i))
		}
		_ = sb.String()
	}
}
```

```bash
go test -bench=. -benchmem
```

```output
BenchmarkConcatPlus-8       200000    5832 ns/op   21080 B/op   99 allocs/op
BenchmarkConcatBuilder-8   2000000     612 ns/op     504 B/op    6 allocs/op
```

(Chiffres indicatifs.) Colonnes : nombre d'itérations, temps par opération, mémoire et allocations par opération. Avant Go 1.24, on écrivait `for i := 0; i < b.N; i++`. Pour comparer deux versions de façon fiable, utilisez l'outil `benchstat`.

## Couverture de code {#couverture}

```bash
go test -cover ./...
go test -coverprofile=couverture.out ./...
go tool cover -html=couverture.out   # rapport visuel dans le navigateur
go tool cover -func=couverture.out   # couverture par fonction
```

Une bonne couverture ne garantit pas de bons tests, mais une couverture faible révèle du code jamais exécuté.

## Les exemples {#exemples}

Une fonction `ExampleXxx` sert à la fois de **documentation** (affichée sur pkg.go.dev) et de **test** : sa sortie est comparée au commentaire `// Output:`.

```go
func ExampleAdditionner() {
	fmt.Println(Additionner(2, 3))
	// Output: 5
}
```

## Le fuzzing {#fuzzing}

Le **fuzzing** génère automatiquement des entrées pour trouver des cas qui font planter le code :

```go
func FuzzInverser(f *testing.F) {
	f.Add("bonjour") // entrées de départ
	f.Add("été")
	f.Fuzz(func(t *testing.T, s string) {
		double := Inverser(Inverser(s))
		if utf8.ValidString(s) && double != s {
			t.Errorf("Inverser(Inverser(%q)) = %q", s, double)
		}
	})
}
```

```bash
go test -fuzz=FuzzInverser -fuzztime=30s
```

Les entrées qui provoquent un échec sont enregistrées dans `testdata/fuzz/` et rejouées à chaque `go test`.

## Tester du code HTTP {#http}

```go
func TestHandlerSalut(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/salut?nom=Ada", nil)
	rec := httptest.NewRecorder()

	handlerSalut(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("statut = %d", rec.Code)
	}
	if body := rec.Body.String(); body != "Salut Ada\n" {
		t.Errorf("corps = %q", body)
	}
}

// Ou un vrai serveur local, pour tester un client HTTP
srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, `{"ok":true}`)
}))
defer srv.Close()
resp, _ := http.Get(srv.URL)
```

## Remplacer les dépendances {#dependances}

Pour tester sans base de données ni API réelle, faites dépendre votre code d'une **interface**, et passez un faux en test (voir [[interfaces#tests]]). C'est plus simple et plus idiomatique en Go que les frameworks de *mocks*.
