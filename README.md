# Méteo API

API REST pour la collecte et la consultation de données météorologiques.

## Architecture

### Structure des dossiers principaux du projet

```
meteo-api/
├── app.js                 # Configuration Express.js et CORS
├── database.js            # Connexion à MongoDB
├── init-mongo.js          # Initialisation de la base de données
├── package.json            # Dépendances du projet
├── routes/
│   └── meteo.js         # Routes API (/live, /archive)
├── store/
│   ├── meteo.js          # Logique métier (lecture DB)
│   ├── sensors.js         # Traitement des fichiers de capteurs et écriture DB
│   └── gpsNmea.js        # Traitement des données GPS NMEA et écriture DB       
└── docker-compose.yml       # Orchestration des services
```

## Services

### 1. fakesonde
- **Rôle** : Simule des données météorologiques et GPS
- **Configuration** : `fakesonde/config.yml`
- **Sortie** : Fichiers dans `./temp/` (modifié pour `/dev/shm` sur Raspberry Pi)
- **Surveillance** : `chokidar` détecte les changements et met à jour la base

### 2. meteo-api (API REST)
- **Rôle** : Expose les données via HTTP
- **Routes** :
  - `GET /meteo/v1/live` : Données en temps réel
  - `GET /meteo/v1/archive` : Données historiques


### 3. meteo-mongodb (Base de données)
- **Rôle** : Stockage persistant des données
- **Collections** : `temperature`, `humidity`, `pressure`, `luminosity`, `wind`, `nmea`

## Flux de données

### Écriture (Store)
1. **chokidar** détecte les changements de fichiers
2. **sensors.js et gpsNmea.js** lisent les données des capteurs et enregistrent dans mongodb
3.**Tous** utilisent `unifiedTimestamp` pour la synchronisation
4.**Sauvegarde** dans MongoDB via `database.js`

### Lecture (API)
1. **meteo.js** interroge MongoDB
2. **Routes** exposent les endpoints REST

## Endpoints

### `/meteo/v1/live`
Retourne les dernières mesures.

**Paramètres** :
- `data` (optionnel) : Filtre les collections (ex: `temperature,wind`)

**Réponse** :
```json
{
  "date": "2026-02-05T15:30:00.000Z",
  "location": {
    "lat": 51.5067,
    "long": -0.1197
  },
  "measurements": {
    "temperature": {"unit": "C", "value": 10.0},
    "humidity": {"unit": "%", "value": 50.0},
    "pressure": {"unit": "hP", "value": 995.0},
    "wind_speed_avg": {"unit": "Kts", "value": 40.9},
    "wind_speed_max": {"unit": "Kts", "value": 57.5},
    "wind_speed_min": {"unit": "Kts", "value": 24.0},
    "wind_heading": {"unit": "°", "value": 175.3}
  }
}
```

### `/meteo/v1/archive`
Retourne les données historiques entre deux timestamps.

**Paramètres requis** :
- `start` : Timestamp de début
- `end` : Timestamp de fin

**Réponse** :
```json
{
  "legend": ["time","lat","long","temperature","humidity","pressure","luminosity","wind_speed_avg","wind_speed_max","wind_speed_min","wind_heading"],
  "unit": ["ISO8601","°","°","C","%","hP","Lux","Kts","Kts","Kts","°"],
  "data": [
    ["2026-02-05T14:30:00.000Z",51.5067,-0.1197,10.0,50.0,995.0,50000,40.9,57.5,24.0,175.3]
  ]
}
```

## Configuration

### Variables d'environnement
- **Développement** : Fichier `.env` local
- **Production** : Secrets Docker/Raspberry Pi
- **Base de données** : MongoDB avec authentification

### CORS
Origines autorisées pour le développement ENSG :
- `http://piensg027:8081`
- `http://piensg028:8080`
- `http://piensg030:8080`
- `http://piensg031:8080`

## Déploiement

### Docker Compose
```bash
docker compose up --build
```

### Services
- **meteo-api** : API Node.js sur port 3000
- **meteo-fakesonde** : Simulateur Python
- **meteo-mongodb** : Base de données MongoDB

### Déploiement sur Raspberry Pi
Sur Raspberry Pi, le déploiement est géré automatiquement par le service systemd `meteoapi.service` :

```ini
[Unit]
Description=Meteo API Service with Docker Compose

[Service]
WorkingDirectory=/opt/meteoapi
ExecStart=/usr/bin/docker compose up

[Install]
WantedBy=multi-user.target
```

Le service est activé avec :
```bash
sudo systemctl enable meteoapi
sudo systemctl start meteoapi
```

## Développement

### Synchronisation des timestamps
Toutes les mesures utilisent le même `unifiedTimestamp` généré au moment de la sauvegarde pour garantir la cohérence temporelle.

### Gestion des erreurs
- **Validation des paramètres** : Erreur 400 pour paramètres invalides
- **Erreurs serveur** : Erreur 500 avec logs appropriés
- **Connexion DB** : Tentatives de reconnexion automatiques

### Fichiers de configuration
- **fakesonde/config.yml** : Simulation locale
- **docker-compose.yml** : Services Docker
- **.env** : Variables d'environnement locales
- **secrets** : Dossiers des Secrets Docker

## Notes

### Raspberry Pi
- **Stockage** : `/dev/shm` pour les fichiers de la sonde.
- **Surveillance** : `chokidar` pour les changements en temps réel

### Sécurité
- **Mots de passe** : Secrets Docker dans le dossier `secrets` mais qui n'est pas mis sur github

## Références

### Base de code
- **Connexion DB** : `database.js` - `getDatabase()`, `connectToDatabase()`
- **Écriture** : `store/sensors.js`, `store/gpsNmea.js`
- **Lecture** : `store/meteo.js` - `getLiveWeatherData()`, `getArchivedWeatherData()`
- **Routes** : `routes/meteo.js` - `/live`, `/archive`

### Références externes
- **NMEA** : https://aprs.gids.nl/nmea/#gga
- **Script d'initialisation** : https://gist.github.com/gbzarelli/c15b607d62fc98ae436564bf8129ea8e
- **Regex JavaScript** : https://stackoverflow.com/questions/983291/purpose-of-x20-x7e-in-regular-expressions
- **Variables Docker** : https://docs.docker.com/build/building/variables/#env-usage-example
- **Secrets Docker** : https://blog.stephane-robert.info/docs/conteneurs/moteurs-conteneurs/docker/secrets/

## Installation sur Raspberry Pi

### Configuration
- **Modèle** : Raspberry Pi  
- **MongoDB** : Version 4.4.18 compatible pour notre version
- **Stockage** : `/dev/shm` pour le stockage des fichiers de la sonde et ``/opt/`` pour le stockage des fichiers du projet
- **le service meteo**: Dans ``/etc/systemd/system/``

### Installation
```bash
# Clonage du dépôt
git clone <url-du-depot>

# Configuration des secrets
mkdir secrets

# Configuration du service
sudo cp meteo-api/meteoapi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable meteoapi
sudo systemctl start meteoapi
```
> On se place dans le dossier ``/opt/meteoapi``
> pour créer le dossier ``secrets`` avec ces fichiers
> et un fichier contient que la valeur du seule information

### Nettoyage des volumes
```bash
# Suppression des volumes existants pour éviter les conflits
docker compose down -v
# Construction des images et lancements des conteneurs
docker compose up --build
```

## Tests

### Endpoints de test
- **Live complet** : `http://localhost:3000/meteo/v1/live`
- **Live filtré** : `http://localhost:3000/meteo/v1/live?data=temperature,wind`
- **Archive** : `http://localhost:3000/meteo/v1/archive?start=1770009629&end=1770305429`
- **Erreur 400** : `http://localhost:3000/meteo/v1/live?data=param_invalide`

### Messages d'erreur
- **400** : Paramètre invalide ou manquant
- **500** : Erreur interne du serveur