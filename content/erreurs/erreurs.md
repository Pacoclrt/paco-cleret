---
title: Gérer les erreurs
category: erreurs
order: 1
level: intermédiaire
summary: En Go, une erreur est une valeur de type error renvoyée en dernier résultat. On la vérifie avec if err != nil, on l'enrichit avec fmt.Errorf("…: %w", err) et on l'inspecte avec errors.Is et errors.As.
aliases: erreur, erreurs, error, errors, err, err != nil, gestion des erreurs, exception, exceptions, try catch, try, catch, errors.new, fmt.errorf, %w, wrap, wrapping, envelopper, unwrap, errors.is, errors.as, errors.join, sentinel, erreur sentinelle, erreur personnalisée, custom error
related: panic-recover, defer, interfaces, faq-nil-interface, fmt
questions:
  - Comment gérer les erreurs en Go ?
  - Pourquoi Go n'a pas d'exceptions (try/catch) ? -> philosophie
  - Comment créer une erreur ? -> creer
  - Comment ajouter du contexte à une erreur (wrapping) ? -> wrapping
  - Quelle différence entre errors.Is et errors.As ? -> is-as
  - Comment créer un type d'erreur personnalisé ? -> types-erreur
  - Qu'est-ce qu'une erreur sentinelle ? -> sentinelles
  - Comment combiner plusieurs erreurs ? -> join
---

@@ rapide

```go
func Diviser(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("division par zéro") // créer une erreur
	}
	return a / b, nil                              // nil = pas d'erreur
}

res, err := Diviser(10, 0)
if err != nil {                                    // toujours vérifier
	return fmt.Errorf("calcul du ratio : %w", err)  // ajouter du contexte
}
```

- `error` est une **interface** : `Error() string`. `nil` signifie « pas d'erreur ».
- L'erreur est **le dernier résultat** d'une fonction, et on la vérifie **immédiatement**.
- `%w` dans `fmt.Errorf` **enveloppe** l'erreur d'origine en ajoutant du contexte.
- `errors.Is(err, cible)` teste une erreur précise ; `errors.As(err, &cible)` extrait un type d'erreur.
- Pas d'exceptions : `panic` est réservé aux situations vraiment anormales.

@@ detail

## La philosophie : les erreurs sont des valeurs {#philosophie}

Go n'a pas de `try`/`catch`. Une erreur est une **valeur ordinaire** que la fonction renvoie, et que l'appelant **doit** traiter. Avantages :

- le chemin d'erreur est **visible** dans le code : on voit où chaque erreur peut survenir ;
- pas de saut invisible à travers 10 niveaux de fonctions ;
- on peut manipuler les erreurs avec tout le langage (les stocker, les comparer, les combiner).

Le prix à payer : des `if err != nil` fréquents. C'est assumé.

## Le type error {#type-error}

```go
type error interface {
	Error() string
}
```

N'importe quel type qui possède une méthode `Error() string` est une erreur.

## Créer une erreur {#creer}

```go
err1 := errors.New("fichier vide")
err2 := fmt.Errorf("ligne %d : valeur %q invalide", 12, "abc")
```

Conventions pour les messages :

- en **minuscules**, **sans ponctuation finale** (ils sont souvent concaténés : `ouverture config : fichier vide`) ;
- précis : incluez les valeurs utiles (identifiant, nom de fichier…).

## Vérifier et propager {#verifier}

```go
func ChargerConfig(chemin string) (*Config, error) {
	data, err := os.ReadFile(chemin)
	if err != nil {
		return nil, fmt.Errorf("lecture de %s : %w", chemin, err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("décodage de %s : %w", chemin, err)
	}
	return &cfg, nil
}
```

Quand une erreur survient, on renvoie la **valeur zéro** pour les autres résultats (`nil`, `0`, `""`). Et l'appelant ne doit pas utiliser ces autres résultats si `err != nil`.

:::danger Ne jamais ignorer une erreur en silence
`data, _ := os.ReadFile(f)` masque les problèmes. Si vous ignorez volontairement une erreur, commentez pourquoi.
:::

## Envelopper une erreur (wrapping) {#wrapping}

Le verbe `%w` de `fmt.Errorf` crée une nouvelle erreur qui **contient** l'erreur d'origine :

```go
err := fmt.Errorf("chargement utilisateur %d : %w", id, sql.ErrNoRows)
fmt.Println(err)                // chargement utilisateur 42 : sql: no rows in result set
fmt.Println(errors.Unwrap(err)) // sql: no rows in result set
```

Chaque couche ajoute son contexte, et on obtient un message qui raconte toute l'histoire :

```text
démarrage serveur : chargement config : lecture de app.json : open app.json: no such file or directory
```

`%v` au lieu de `%w` inclut le message mais **coupe la chaîne** : l'erreur d'origine n'est plus détectable par `errors.Is`. Utilisez `%v` quand vous ne voulez pas exposer l'erreur interne à vos appelants.

## errors.Is et errors.As {#is-as}

`errors.Is` vérifie si une erreur **précise** est présente dans la chaîne :

```go
if errors.Is(err, os.ErrNotExist) {
	fmt.Println("le fichier n'existe pas, on en crée un")
}
```

`errors.As` cherche une erreur d'un **type** donné dans la chaîne et l'extrait :

```go
var pathErr *fs.PathError
if errors.As(err, &pathErr) {
	fmt.Println("opération :", pathErr.Op, "chemin :", pathErr.Path)
}
```

| Fonction | Question posée | Exemple |
|---|---|---|
| `errors.Is(err, cible)` | est-ce **cette** erreur ? | `errors.Is(err, io.EOF)` |
| `errors.As(err, &cible)` | est-ce une erreur de **ce type** ? | `errors.As(err, &netErr)` |
| `errors.Unwrap(err)` | quelle erreur est enveloppée ? | rarement utilisé directement |

:::tip == ou errors.Is ?
`err == io.EOF` ne fonctionne que si l'erreur n'a pas été enveloppée. `errors.Is` parcourt toute la chaîne : utilisez-le systématiquement.
:::

## Les erreurs sentinelles {#sentinelles}

Une **sentinelle** est une variable d'erreur exportée, que les appelants comparent avec `errors.Is` :

```go
var (
	ErrIntrouvable = errors.New("introuvable")
	ErrNonAutorise = errors.New("non autorisé")
)

func Trouver(id int) (*Article, error) {
	a, ok := articles[id]
	if !ok {
		return nil, fmt.Errorf("article %d : %w", id, ErrIntrouvable)
	}
	return a, nil
}

if errors.Is(err, ErrIntrouvable) {
	http.Error(w, "404", http.StatusNotFound)
}
```

Exemples standard : `io.EOF`, `os.ErrNotExist`, `sql.ErrNoRows`, `context.Canceled`, `context.DeadlineExceeded`. Par convention, leur nom commence par `Err`.

## Les types d'erreur personnalisés {#types-erreur}

Quand l'appelant a besoin d'**informations structurées**, on crée un type :

```go
type ErreurValidation struct {
	Champ   string
	Message string
}

func (e *ErreurValidation) Error() string {
	return fmt.Sprintf("champ %s : %s", e.Champ, e.Message)
}

func Valider(u Utilisateur) error {
	if u.Email == "" {
		return &ErreurValidation{Champ: "email", Message: "obligatoire"}
	}
	return nil
}

err := Valider(u)
var ev *ErreurValidation
if errors.As(err, &ev) {
	fmt.Println("champ en erreur :", ev.Champ)
}
```

Pour qu'un type d'erreur enveloppe lui-même une autre erreur, ajoutez une méthode `Unwrap() error`.

:::warning Le piège du nil typé
Une fonction qui renvoie `error` ne doit **jamais** renvoyer un pointeur nil d'un type concret (`var e *ErreurValidation; return e`) : l'erreur ne serait pas `nil` ! Renvoyez directement `nil`. Voir [[faq-nil-interface]].
:::

## Combiner plusieurs erreurs {#join}

Depuis Go 1.20, `errors.Join` regroupe plusieurs erreurs en une seule :

```go
func ValiderTout(u Utilisateur) error {
	var errs []error
	if u.Nom == "" {
		errs = append(errs, errors.New("nom obligatoire"))
	}
	if u.Age < 0 {
		errs = append(errs, errors.New("âge négatif"))
	}
	return errors.Join(errs...) // nil si errs est vide
}
```

`errors.Is` et `errors.As` fonctionnent sur chacune des erreurs combinées.

## Où traiter une erreur ? {#strategies}

Une erreur doit être **traitée une seule fois**. Soit vous la **renvoyez** (avec du contexte), soit vous la **gérez** (log, valeur de repli, nouvel essai, message à l'utilisateur). Pas les deux :

```go
// ❌ logguée ET renvoyée : elle apparaîtra plusieurs fois dans les logs
if err != nil {
	log.Println(err)
	return err
}
```

Stratégies courantes :

| Stratégie | Quand |
|---|---|
| Propager avec contexte | cas général, dans les couches basses |
| Réessayer | erreurs temporaires (réseau, verrou) |
| Valeur par défaut | erreur non bloquante (config optionnelle absente) |
| Logguer et continuer | traitement par lots, une ligne invalide parmi d'autres |
| Arrêter le programme | dans `main`, erreur irrécupérable : `log.Fatal(err)` |

## Erreurs ou panic ? {#erreur-ou-panic}

- **Erreur** : tout ce qui peut raisonnablement arriver (fichier absent, saisie invalide, réseau coupé).
- **panic** : bug du programme ou état impossible (indice hors limites, invariant violé), ou échec d'initialisation au démarrage.

Voir [[panic-recover]].
