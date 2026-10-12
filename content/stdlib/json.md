---
title: JSON
category: stdlib
order: 4
level: intermédiaire
summary: encoding/json convertit des structs Go en JSON (json.Marshal) et inversement (json.Unmarshal). Les tags `json:"nom,omitempty"` contrôlent les noms de champs. Seuls les champs exportés (Majuscule) sont pris en compte.
aliases: json, encoding/json, marshal, unmarshal, sérialiser, sérialisation, désérialiser, parser du json, parse json, encoder, décoder, decoder, encoder json, tag json, omitempty, omitzero, marshalindent, rawmessage, json en struct, struct en json, api json
related: structs, http, fichiers, faq-champs-json, faq-api-rest
questions:
  - Comment convertir une struct en JSON ?
  - Comment lire du JSON dans une struct ? -> unmarshal
  - À quoi servent les tags json:"nom,omitempty" ? -> tags
  - Pourquoi mes champs n'apparaissent pas dans le JSON ? -> champs-exportes
  - Comment lire du JSON dont je ne connais pas la structure ? -> structure-inconnue
  - Comment lire du JSON depuis une requête HTTP ou un fichier ? -> flux
  - Comment personnaliser l'encodage JSON d'un type ? -> personnaliser
---

@@ rapide

```go
type Utilisateur struct {
	ID         int      `json:"id"`
	Nom        string   `json:"nom"`
	Email      string   `json:"email,omitempty"` // omis si vide
	Roles      []string `json:"roles"`
	motDePasse string   // minuscule : ignoré
}

// Go → JSON
u := Utilisateur{ID: 1, Nom: "Ada", Roles: []string{"admin"}}
data, err := json.Marshal(u)
fmt.Println(string(data)) // {"id":1,"nom":"Ada","roles":["admin"]}

// JSON → Go
var u2 Utilisateur
err = json.Unmarshal([]byte(`{"id":2,"nom":"Linus"}`), &u2) // passer un POINTEUR
fmt.Println(u2.Nom)                                         // Linus
```

- Seuls les champs **exportés** (Majuscule) sont encodés et décodés.
- Les **tags** définissent le nom JSON et des options (`omitempty`, `-`).
- `Unmarshal` exige un **pointeur** vers la destination.
- Pour un flux (fichier, requête HTTP), utilisez `json.NewDecoder(r).Decode(&v)`.

@@ detail

## Encoder : Marshal {#marshal}

```go
type Produit struct {
	Nom   string  `json:"nom"`
	Prix  float64 `json:"prix"`
	Stock int     `json:"stock"`
}

p := Produit{"Clavier", 49.9, 12}
data, err := json.Marshal(p)
if err != nil {
	log.Fatal(err)
}
fmt.Println(string(data)) // {"nom":"Clavier","prix":49.9,"stock":12}

joli, _ := json.MarshalIndent(p, "", "  ") // indenté, pour les humains
fmt.Println(string(joli))
```

```output
{
  "nom": "Clavier",
  "prix": 49.9,
  "stock": 12
}
```

Correspondance des types :

| Go | JSON |
|---|---|
| `bool` | `true` / `false` |
| nombres | nombre |
| `string` | chaîne |
| slice, array | tableau (`nil` → `null`) |
| struct, `map[string]T` | objet |
| pointeur nil, interface nil | `null` |
| `[]byte` | chaîne encodée en base64 |
| `time.Time` | chaîne au format RFC 3339 |

Les clés des maps sont **triées** dans le JSON produit.

## Décoder : Unmarshal {#unmarshal}

```go
entree := []byte(`{"nom":"Souris","prix":19.5,"stock":3,"couleur":"noire"}`)

var p Produit
if err := json.Unmarshal(entree, &p); err != nil {
	log.Fatal(err)
}
fmt.Printf("%+v\n", p) // {Nom:Souris Prix:19.5 Stock:3}
```

Comportements à connaître :

- Les champs JSON **inconnus** (`couleur`) sont **ignorés** silencieusement.
- Les champs **absents** du JSON gardent leur valeur actuelle (la valeur zéro pour une variable neuve).
- La correspondance des noms est **insensible à la casse** (`"NOM"` remplit `Nom`), mais une correspondance exacte est prioritaire.
- Un type incompatible (`"prix": "cher"`) produit une erreur `json: cannot unmarshal string into Go struct field Produit.prix of type float64`.

## Les tags {#tags}

```go
type Article struct {
	ID        int       `json:"id"`
	Titre     string    `json:"titre"`
	Resume    string    `json:"resume,omitempty"` // omis si ""
	Tags      []string  `json:"tags,omitempty"`   // omis si nil ou vide
	Brouillon bool      `json:"-"`                // jamais encodé ni décodé
	Vues      int       `json:"vues,string"`      // encodé comme "123"
	Publie    time.Time `json:"publie,omitzero"`  // omis si zéro (Go 1.24+)
}
```

| Option | Effet |
|---|---|
| `json:"nom"` | nom de la clé JSON |
| `omitempty` | omis si valeur « vide » : `false`, `0`, `""`, `nil`, slice/map de longueur 0 |
| `omitzero` | omis si valeur zéro (fonctionne aussi pour les structs comme `time.Time`), Go 1.24+ |
| `json:"-"` | champ ignoré |
| `json:",string"` | nombre ou booléen encodé dans une chaîne |

Sans tag, la clé JSON est le **nom du champ Go** tel quel (`"Titre"`).

## Les champs non exportés {#champs-exportes}

```go
type Config struct {
	hote string // ❌ minuscule : invisible pour encoding/json
	Port int
}

data, _ := json.Marshal(Config{hote: "localhost", Port: 80})
fmt.Println(string(data)) // {"Port":80}
```

`encoding/json` est un **autre package** : il ne voit que les champs **exportés**. Mettez une majuscule au champ et un tag pour garder un nom JSON en minuscules. Voir [[faq-champs-json]].

## Structure inconnue ou dynamique {#structure-inconnue}

Si on ne connaît pas la forme du JSON, on décode dans un `map[string]any` ou un `any` :

```go
var donnees map[string]any
json.Unmarshal([]byte(`{"nom":"Ada","age":36,"langages":["go","c"]}`), &donnees)

nom := donnees["nom"].(string)
age := donnees["age"].(float64)         // ⚠️ tous les nombres deviennent des float64
langages := donnees["langages"].([]any) // les tableaux deviennent des []any
fmt.Println(nom, int(age), len(langages))
```

| JSON | type Go dans un `any` |
|---|---|
| objet | `map[string]any` |
| tableau | `[]any` |
| nombre | `float64` |
| chaîne | `string` |
| booléen | `bool` |
| `null` | `nil` |

C'est vite fastidieux (assertions de type partout) : préférez des **structs**, même partielles, avec seulement les champs utiles.

`json.RawMessage` permet de différer le décodage d'une partie :

```go
type Evenement struct {
	Type    string          `json:"type"`
	Donnees json.RawMessage `json:"donnees"` // gardé tel quel
}

// selon e.Type, on décode ensuite e.Donnees dans la bonne struct
```

## Lire et écrire des flux {#flux}

`json.NewDecoder` et `json.NewEncoder` travaillent directement sur un `io.Reader` / `io.Writer` (fichier, requête et réponse HTTP) :

```go
// Lire le corps d'une requête HTTP
func creer(w http.ResponseWriter, r *http.Request) {
	var p Produit
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields() // refuser les champs inconnus
	if err := dec.Decode(&p); err != nil {
		http.Error(w, "JSON invalide : "+err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p) // écrit directement dans la réponse
}

// Lire un fichier JSON
f, err := os.Open("produits.json")
if err != nil {
	log.Fatal(err)
}
defer f.Close()
var produits []Produit
if err := json.NewDecoder(f).Decode(&produits); err != nil {
	log.Fatal(err)
}
```

## Personnaliser l'encodage {#personnaliser}

Un type peut contrôler sa représentation en implémentant `json.Marshaler` et `json.Unmarshaler` :

```go
type Statut int

const (
	Actif Statut = iota
	Suspendu
)

var noms = map[Statut]string{Actif: "actif", Suspendu: "suspendu"}

func (s Statut) MarshalJSON() ([]byte, error) {
	return json.Marshal(noms[s]) // "actif" au lieu de 0
}

func (s *Statut) UnmarshalJSON(data []byte) error {
	var texte string
	if err := json.Unmarshal(data, &texte); err != nil {
		return err
	}
	for k, v := range noms {
		if v == texte {
			*s = k
			return nil
		}
	}
	return fmt.Errorf("statut inconnu %q", texte)
}
```

Implémenter `encoding.TextMarshaler` (`MarshalText`) fonctionne aussi, et permet en plus d'utiliser le type comme **clé de map**.

## Pièges fréquents {#pieges}

- Oublier le `&` dans `Unmarshal` : erreur `json: Unmarshal(non-pointer main.Produit)`.
- Champs en minuscules : absents du JSON.
- Nombres décodés en `float64` dans un `any` : les grands entiers (> 2⁵³) perdent en précision. Utilisez une struct avec `int64`, ou `dec.UseNumber()`.
- Une slice `nil` donne `null`, une slice vide donne `[]` : initialisez avec `[]T{}` si le client attend un tableau.
