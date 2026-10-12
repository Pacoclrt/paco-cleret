---
title: Serveur et client HTTP (net/http)
category: stdlib
order: 5
level: intermédiaire
summary: net/http permet de créer un serveur web (http.HandleFunc, http.ListenAndServe) et d'appeler des API (http.Get, http.Client). Depuis Go 1.22, le routeur gère les méthodes et les paramètres de chemin : "GET /users/{id}".
aliases: http, net/http, serveur, serveur web, web, api, rest, api rest, handler, handlefunc, listenandserve, servemux, routeur, router, route, routes, pathvalue, paramètre d'url, query, requête, request, réponse, response, client http, http.get, post, middleware, fichiers statiques, fileserver, status code, code http, cors
related: json, context, faq-api-rest, patterns-concurrence, closures
questions:
  - Comment créer un serveur web en Go ?
  - Comment définir des routes avec paramètres (/users/{id}) ? -> routage
  - Comment renvoyer du JSON dans un handler ? -> reponses
  - Comment lire les paramètres d'URL (query string) ? -> requete
  - Comment faire une requête HTTP (client) ? -> client
  - Comment écrire un middleware ? -> middleware
  - Comment servir des fichiers statiques ? -> fichiers-statiques
---

@@ rapide

```go title=main.go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Bienvenue !")
	})

	mux.HandleFunc("GET /bonjour/{nom}", func(w http.ResponseWriter, r *http.Request) {
		nom := r.PathValue("nom") // paramètre de chemin (Go 1.22+)
		fmt.Fprintf(w, "Bonjour, %s !\n", nom)
	})

	log.Println("écoute sur http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
```

```go
// Client
resp, err := http.Get("https://api.github.com")
if err != nil {
	log.Fatal(err)
}
defer resp.Body.Close()
body, err := io.ReadAll(resp.Body)
```

Chaque requête est traitée dans **sa propre goroutine** : un serveur Go gère naturellement des milliers de connexions simultanées.

@@ detail

## Le handler {#handler}

Un **handler** reçoit la requête et écrit la réponse :

```go
func accueil(w http.ResponseWriter, r *http.Request) {
	// r : la requête (méthode, URL, en-têtes, corps…)
	// w : où écrire la réponse
	fmt.Fprintf(w, "Vous avez demandé %s avec %s\n", r.URL.Path, r.Method)
}
```

Formellement, un handler est tout ce qui implémente l'interface `http.Handler` :

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

`http.HandlerFunc` adapte une simple fonction à cette interface (voir [[types-personnalises#types-fonction]]).

## Le routage {#routage}

Depuis **Go 1.22**, le `ServeMux` standard comprend les **méthodes** et les **paramètres** :

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /articles", listerArticles)
mux.HandleFunc("POST /articles", creerArticle)
mux.HandleFunc("GET /articles/{id}", lireArticle)
mux.HandleFunc("DELETE /articles/{id}", supprimerArticle)
mux.HandleFunc("GET /fichiers/{chemin...}", servirFichier) // capture le reste du chemin
mux.HandleFunc("GET /{$}", accueil)                        // uniquement « / » exactement

func lireArticle(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id invalide", http.StatusBadRequest)
		return
	}
	fmt.Fprintf(w, "article %d\n", id)
}
```

Règles des motifs :

- Un motif qui finit par `/` (ex. `/static/`) correspond à **tout ce qui commence** par ce préfixe. `"/"` attrape donc tout ce qui n'a pas de route plus précise.
- Le motif le **plus spécifique** l'emporte, quel que soit l'ordre de déclaration.
- Une méthode non autorisée renvoie automatiquement `405 Method Not Allowed`.
- `GET` correspond aussi aux requêtes `HEAD`.

## Lire la requête {#requete}

```go
func rechercher(w http.ResponseWriter, r *http.Request) {
	// Paramètres d'URL : /recherche?q=gopher&page=2
	q := r.URL.Query().Get("q") // "gopher" ("" si absent)
	page := r.URL.Query().Get("page")

	// En-têtes
	agent := r.Header.Get("User-Agent")
	token := r.Header.Get("Authorization")

	// Formulaire (POST application/x-www-form-urlencoded)
	if err := r.ParseForm(); err == nil {
		email := r.FormValue("email")
		_ = email
	}

	fmt.Fprintln(w, q, page, agent, token)
}
```

Lire un corps JSON :

```go
type NouvelArticle struct {
	Titre string `json:"titre"`
}

func creerArticle(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // limite à 1 Mo
	var in NouvelArticle
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "JSON invalide", http.StatusBadRequest)
		return
	}
	// …
}
```

## Écrire la réponse {#reponses}

L'ordre compte : **en-têtes**, puis **code de statut**, puis **corps**.

```go
func ecrireJSON(w http.ResponseWriter, statut int, v any) {
	w.Header().Set("Content-Type", "application/json")   // 1. en-têtes
	w.WriteHeader(statut)                                // 2. statut
	if err := json.NewEncoder(w).Encode(v); err != nil { // 3. corps
		log.Println("encodage JSON :", err)
	}
}

func lireArticle(w http.ResponseWriter, r *http.Request) {
	a, err := trouver(r.PathValue("id"))
	if err != nil {
		ecrireJSON(w, http.StatusNotFound, map[string]string{"erreur": "introuvable"})
		return // ⚠️ ne pas oublier le return
	}
	ecrireJSON(w, http.StatusOK, a)
}
```

| Fonction | Usage |
|---|---|
| `w.Header().Set(k, v)` | définir un en-tête (avant `WriteHeader`) |
| `w.WriteHeader(code)` | envoyer le statut ; sans appel, c'est `200` au premier `Write` |
| `w.Write([]byte)` / `fmt.Fprint(w, …)` | écrire le corps |
| `http.Error(w, msg, code)` | réponse d'erreur en texte |
| `http.Redirect(w, r, url, code)` | redirection |
| `http.NotFound(w, r)` | 404 |

Les codes courants ont des constantes : `http.StatusOK` (200), `StatusCreated` (201), `StatusNoContent` (204), `StatusBadRequest` (400), `StatusUnauthorized` (401), `StatusForbidden` (403), `StatusNotFound` (404), `StatusInternalServerError` (500).

## Middlewares {#middleware}

Un **middleware** enveloppe un handler pour ajouter un comportement commun (logs, authentification, CORS, récupération des panics) :

```go
func journal(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		debut := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(debut))
	})
}

func authentifie(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			http.Error(w, "non autorisé", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

handler := journal(authentifie(mux)) // s'exécutent de l'extérieur vers l'intérieur
http.ListenAndServe(":8080", handler)
```

## Fichiers statiques {#fichiers-statiques}

```go
mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./public"))))
```

`/static/style.css` sert alors `./public/style.css`. Avec `embed`, on peut intégrer ces fichiers dans le binaire : `http.FileServerFS(fsEmbarque)` (voir [[fichiers#embed]]).

## Un serveur prêt pour la production {#serveur-production}

`http.ListenAndServe` n'a **aucun délai d'expiration** : un client lent peut garder une connexion ouverte indéfiniment. En production, configurez un `http.Server` :

```go
srv := &http.Server{
	Addr:              ":8080",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,
	ReadTimeout:       10 * time.Second,
	WriteTimeout:      15 * time.Second,
	IdleTimeout:       60 * time.Second,
}
log.Fatal(srv.ListenAndServe())
```

Pour un arrêt propre (laisser finir les requêtes en cours), voir [[patterns-concurrence#arret-propre]].

## Le client HTTP {#client}

```go
// GET simple
resp, err := http.Get("https://api.exemple.com/articles")
if err != nil {
	return err // erreur réseau (DNS, connexion refusée…)
}
defer resp.Body.Close() // ⚠️ toujours fermer le corps

if resp.StatusCode != http.StatusOK { // un 404 ou 500 n'est PAS une erreur Go
	return fmt.Errorf("statut inattendu : %s", resp.Status)
}

var articles []Article
if err := json.NewDecoder(resp.Body).Decode(&articles); err != nil {
	return err
}
```

:::warning Le client par défaut n'a pas de timeout
`http.Get` utilise `http.DefaultClient`, **sans délai d'expiration** : une requête peut bloquer indéfiniment. Créez votre client :

```go
client := &http.Client{Timeout: 10 * time.Second}
resp, err := client.Get(url)
```
:::

Requête complète (méthode, en-têtes, corps, contexte) :

```go
corps, _ := json.Marshal(map[string]string{"titre": "Bonjour"})

req, err := http.NewRequestWithContext(ctx, http.MethodPost,
	"https://api.exemple.com/articles", bytes.NewReader(corps))
if err != nil {
	return err
}
req.Header.Set("Content-Type", "application/json")
req.Header.Set("Authorization", "Bearer "+token)

resp, err := client.Do(req)
if err != nil {
	return err
}
defer resp.Body.Close()
```

Réutilisez le **même** `http.Client` dans toute l'application : il gère un pool de connexions.

## Tester un handler {#tests}

Le package `net/http/httptest` simule requêtes et réponses sans réseau :

```go
func TestAccueil(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	rec := httptest.NewRecorder()

	accueil(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("statut = %d, attendu 200", rec.Code)
	}
}
```

Un exemple d'API complète se trouve dans [[faq-api-rest]].
