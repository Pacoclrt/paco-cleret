---
title: Comment créer une petite API REST en JSON ?
category: faq
order: 19
level: intermédiaire
summary: Avec la seule bibliothèque standard : un http.ServeMux avec des routes "GET /todos/{id}", des handlers qui lisent et écrivent du JSON, et une map protégée par un mutex comme stockage. Aucun framework n'est nécessaire.
aliases: api rest, api, rest, crud, api json, créer une api, serveur api, backend, web service, endpoint, todo api, gin, echo, fiber, framework web
related: http, json, sync, structs, erreurs
questions:
  - Comment créer une API REST en Go sans framework ?
  - Comment organiser les handlers d'une API ? -> code
  - Faut-il utiliser un framework comme Gin ou Echo ? -> framework
---

@@ rapide

Une API complète de gestion de tâches (CRUD) en un fichier, sans dépendance :

```bash
go run .
curl -X POST localhost:8080/todos -d '{"titre":"Apprendre Go"}'
curl localhost:8080/todos
curl localhost:8080/todos/1
curl -X DELETE localhost:8080/todos/1
```

Les ingrédients :

- `http.NewServeMux()` et des motifs `"GET /todos/{id}"` (Go 1.22+) ;
- `r.PathValue("id")` pour lire les paramètres ;
- `json.NewDecoder(r.Body).Decode(&v)` pour lire, `json.NewEncoder(w).Encode(v)` pour répondre ;
- un `sync.Mutex` pour protéger les données, car chaque requête tourne dans sa propre goroutine.

Le code complet est dans l'explication détaillée.

@@ detail

## Le code complet {#code}

```go title=main.go
package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// ---------- Modèle ----------

type Todo struct {
	ID    int       `json:"id"`
	Titre string    `json:"titre"`
	Fait  bool      `json:"fait"`
	Cree  time.Time `json:"cree"`
}

// ---------- Stockage en mémoire, sûr pour la concurrence ----------

type Store struct {
	mu      sync.Mutex
	todos   map[int]Todo
	suivant int
}

var ErrIntrouvable = errors.New("tâche introuvable")

func NewStore() *Store {
	return &Store{todos: make(map[int]Todo), suivant: 1}
}

func (s *Store) Lister() []Todo {
	s.mu.Lock()
	defer s.mu.Unlock()
	res := make([]Todo, 0, len(s.todos))
	for id := 1; id < s.suivant; id++ { // ordre des identifiants
		if t, ok := s.todos[id]; ok {
			res = append(res, t)
		}
	}
	return res
}

func (s *Store) Creer(titre string) Todo {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := Todo{ID: s.suivant, Titre: titre, Cree: time.Now()}
	s.todos[t.ID] = t
	s.suivant++
	return t
}

func (s *Store) Lire(id int) (Todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.todos[id]
	if !ok {
		return Todo{}, ErrIntrouvable
	}
	return t, nil
}

func (s *Store) MettreAJour(id int, titre string, fait bool) (Todo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.todos[id]
	if !ok {
		return Todo{}, ErrIntrouvable
	}
	t.Titre, t.Fait = titre, fait
	s.todos[id] = t
	return t, nil
}

func (s *Store) Supprimer(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.todos[id]; !ok {
		return ErrIntrouvable
	}
	delete(s.todos, id)
	return nil
}

// ---------- Handlers HTTP ----------

type API struct {
	store *Store
}

type entreeTodo struct {
	Titre string `json:"titre"`
	Fait  bool   `json:"fait"`
}

func (a *API) lister(w http.ResponseWriter, r *http.Request) {
	ecrireJSON(w, http.StatusOK, a.store.Lister())
}

func (a *API) creer(w http.ResponseWriter, r *http.Request) {
	var in entreeTodo
	if err := lireJSON(w, r, &in); err != nil {
		ecrireErreur(w, http.StatusBadRequest, err.Error())
		return
	}
	if in.Titre == "" {
		ecrireErreur(w, http.StatusUnprocessableEntity, "le titre est obligatoire")
		return
	}
	ecrireJSON(w, http.StatusCreated, a.store.Creer(in.Titre))
}

func (a *API) lire(w http.ResponseWriter, r *http.Request) {
	id, ok := idDepuis(w, r)
	if !ok {
		return
	}
	t, err := a.store.Lire(id)
	if err != nil {
		ecrireErreur(w, http.StatusNotFound, err.Error())
		return
	}
	ecrireJSON(w, http.StatusOK, t)
}

func (a *API) mettreAJour(w http.ResponseWriter, r *http.Request) {
	id, ok := idDepuis(w, r)
	if !ok {
		return
	}
	var in entreeTodo
	if err := lireJSON(w, r, &in); err != nil {
		ecrireErreur(w, http.StatusBadRequest, err.Error())
		return
	}
	t, err := a.store.MettreAJour(id, in.Titre, in.Fait)
	if err != nil {
		ecrireErreur(w, http.StatusNotFound, err.Error())
		return
	}
	ecrireJSON(w, http.StatusOK, t)
}

func (a *API) supprimer(w http.ResponseWriter, r *http.Request) {
	id, ok := idDepuis(w, r)
	if !ok {
		return
	}
	if err := a.store.Supprimer(id); err != nil {
		ecrireErreur(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- Utilitaires ----------

func idDepuis(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		ecrireErreur(w, http.StatusBadRequest, "identifiant invalide")
		return 0, false
	}
	return id, true
}

func lireJSON(w http.ResponseWriter, r *http.Request, v any) error {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func ecrireJSON(w http.ResponseWriter, statut int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statut)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Println("encodage :", err)
	}
}

func ecrireErreur(w http.ResponseWriter, statut int, message string) {
	ecrireJSON(w, statut, map[string]string{"erreur": message})
}

func journal(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		debut := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%v)", r.Method, r.URL.Path, time.Since(debut))
	})
}

// ---------- Point d'entrée ----------

func main() {
	api := &API{store: NewStore()}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /todos", api.lister)
	mux.HandleFunc("POST /todos", api.creer)
	mux.HandleFunc("GET /todos/{id}", api.lire)
	mux.HandleFunc("PUT /todos/{id}", api.mettreAJour)
	mux.HandleFunc("DELETE /todos/{id}", api.supprimer)

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           journal(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Println("API sur http://localhost:8080")
	log.Fatal(srv.ListenAndServe())
}
```

## Les points clés {#points-cles}

- **Routes** : chaque combinaison méthode + chemin a son handler ; un `GET` sur `/todos/abc` renvoie `400`, un `PATCH` renvoie automatiquement `405`.
- **Concurrence** : le serveur traite chaque requête dans une goroutine, d'où le `sync.Mutex` du `Store` (voir [[faq-data-race]]).
- **Méthodes comme handlers** : `api.lister` est une *method value* qui a accès au `store`, sans variable globale.
- **Codes HTTP** : `201` à la création, `204` après suppression, `404` si absent, `400` pour une requête invalide.
- **Sécurité minimale** : taille du corps limitée, champs inconnus refusés, `ReadHeaderTimeout` configuré.

## Pour aller plus loin {#aller-plus-loin}

- Remplacer la map par une vraie base de données (`database/sql` avec PostgreSQL ou SQLite).
- Découper en packages : `internal/todo` (modèle et stockage), `internal/http` (handlers).
- Ajouter des tests avec `httptest` (voir [[tests#http]]).
- Ajouter un arrêt propre (voir [[patterns-concurrence#arret-propre]]).

## Faut-il un framework ? {#framework}

Depuis Go 1.22, le routeur standard gère les méthodes et les paramètres de chemin : la bibliothèque standard suffit pour la plupart des API. Des frameworks comme **Gin**, **Echo**, **Chi** ou **Fiber** apportent un peu de confort (validation, groupes de routes, middlewares prêts à l'emploi), au prix d'une dépendance. Commencer avec `net/http` permet de bien comprendre ce qu'ils font.
