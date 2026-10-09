# Bunker Finder v6

Carte interactive de **65 000+ châteaux, forts, citadelles, remparts et bunkers** du monde entier, à partir des données OpenStreetMap.

## Nouveautés de la v6

- **4× plus de fortifications** : les bâtiments et enceintes dessinés en polygones (ways / relations OSM), auparavant ignorés, sont désormais inclus et dédupliqués.
- **Données 18× plus légères** : un fichier compact de ~2 Mo (au lieu de 35 Mo) préparé à l’avance → chargement en 1 à 2 secondes.
- **Recherche** instantanée, insensible aux accents, multi-mots (nom, ville, pays, type), avec suggestions, navigation au clavier, recherche de lieux (Nominatim) et de coordonnées.
- **Fiche détaillée** : photos Wikimedia Commons (avec crédits) et visionneuse, résumé Wikipédia dans la langue de l’interface, vue aérienne, contour du bâtiment tracé sur la carte, horaires/architecte/protection, sites à proximité, itinéraire, Street View, partage.
- **Filtres** : type, pays, époque de construction, ruines/conservés, monument protégé, article Wikipédia, visitable, nommés uniquement.
- **Carte** : clustering rapide (Supercluster) avec donuts colorés par type, marqueurs par catégorie, fonds Plan / Épuré / Satellite / Relief, géolocalisation, fortification au hasard.
- **Design** refait : panneau latéral (bureau) et bottom sheet (mobile), thème clair/sombre/auto, FR/EN, favoris, liens partageables (`#f=w123456`), raccourcis clavier (`/`, `Échap`, `R`, `F`).

## Développement

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production (dist/)
npm run lint
npm run format
```

## Données

Les données brutes OpenStreetMap sont dans `data/osm-export.json.gz` (export Overpass). Le script `scripts/build-data.mjs` les transforme en un jeu de données compact, colonne par colonne, servi par l’application : `public/data/fortifications.json.gz`.

```bash
./get_data.sh           # télécharge un nouvel export Overpass puis reconstruit
./get_data.sh --build   # reconstruit seulement à partir de l’export existant
npm run data            # idem que --build
```

Le script :

- garde les nœuds, ways et relations (centre calculé pour les polygones) ;
- classe chaque élément (château fort, château/manoir, fort/citadelle, bunker, rempart, tour, autre) ;
- détecte ruines, protection patrimoniale, Wikipédia/Wikidata, photos, visitabilité et année de construction ;
- fusionne les doublons (même nom ou même Wikidata à moins de ~500 m) ;
- calcule le pays de chaque point hors ligne (`@rapideditor/country-coder`).

Les informations complémentaires (photos, résumé, contour, horaires…) sont chargées à la demande depuis Wikidata, Wikipédia, Wikimedia Commons et l’API OpenStreetMap.

## Crédits

Données © contributeurs [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL). Textes Wikipédia (CC BY-SA), photos Wikimedia Commons (licences indiquées dans l’app). Fonds de carte © OpenStreetMap, Esri, OpenTopoMap.
