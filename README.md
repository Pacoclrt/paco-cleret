# Carnet Piscine Go

Site de révision de la **piscine Golang** (Ynov Campus Rouen B1) : les 36 épreuves des quêtes 1 à 4, à savoir recoder devant le jury.

**Site en ligne** : https://TON-PSEUDO.github.io/TON-REPO/ <!-- remplace par l'adresse de ton site GitHub Pages -->

## Fonctionnalités

- **4 quêtes, 36 épreuves** : consigne traduite en français, code complet, explication ligne par ligne, test et sortie attendue.
- **Mode entraînement** : le code est masqué pour que tu le réécrives de mémoire.
- **Quiz jury** : épreuve tirée au hasard, chrono et brouillon.
- **Vérification automatique du code**, directement dans le navigateur. Le quiz répond **OUI / NON** et dit ce qu'il manque. Il contrôle :
  - la syntaxe, le package et les imports (seul `z01` est autorisé) ;
  - la signature et les règles de la consigne (pas de `for`, `make` ou `append` quand c'est interdit…) ;
  - la compilation ;
  - les résultats sur plusieurs cas de test.
- **Antisèche** : codes ASCII, conversions, boucles, slices, récursion.
- Recherche rapide (`/`), thème clair / sombre, adapté au mobile, consultable hors ligne.

## Contraintes de la piscine

Pas de `fmt` ni d'autre import que [`github.com/01-edu/z01`](https://github.com/01-edu/z01) : tout l'affichage se fait avec `z01.PrintRune`.

## Structure

```
site/            site statique (HTML, CSS, JS), déployé sur GitHub Pages
  assets/verif/  vérificateur Go compilé en WebAssembly
verificateur/    sources Go du vérificateur et outil de build
```

## Lancer en local

```bash
cd site
python3 -m http.server 8000
```

Ouvre ensuite http://localhost:8000. Un serveur est nécessaire pour la vérification du code, même en local.

## Reconstruire le vérificateur

À faire uniquement si tu modifies les cas de test (`verificateur/verif/exercises.go`) :

```bash
cd verificateur
go run ./cmd/build
```

## Technologies

HTML / CSS / JavaScript sans framework · Go compilé en WebAssembly · [`go/types`](https://pkg.go.dev/go/types) pour la compilation · [yaegi](https://github.com/traefik/yaegi) pour l'exécution.

## Auteur

**Paco Cleret**, étudiant en cybersécurité à Ynov Campus Rouen.
