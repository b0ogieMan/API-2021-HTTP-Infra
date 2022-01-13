# API - Labo HTTP
## Étape 6
### Description
L'objectif de cette étape est de mettre en place le load balancing entre plusieurs noeuds de même type.

Lors des étapes précédentes, nous utilisions un container avec une image Apache comme reverse-proxy. Cette fois, nous allons utiliser
un outil très pratique Traefik. Il fait globalement le travail de reverse proxy HTTP et répartiteur de charge. 
De plus, auparavant nous utilisions un Dockerfile pour construire nos images. Dans cette étape, nous allons mettre en pratique
l'utilisation de docker-compose. Un outil docker très pratique permettant de générer une infrastructure Docker à partir d'un fichier .yml.

### Marche à suivre

Créer fichier docker-compose.yml dans le répertoire docker-reverse-proxy (au même niveau que le Dockerfile).
Dans ce fichier, y insérer les lignes suivantes : 

```
version: "3"

services: 
 traefik: 
  image: "traefik:v2.5"
  ports:
   - "${FRONT_HTTP_PORT:-9090}:80"
   - "8080:8080"
  volumes:
   - /var/run/docker.sock:/var/run/docker.sock

  environment:
   - TRAEFIK_PROVIDERS_DOCKER_EXPOSEDBYDEFAULT=false
   - TRAEFIK_PROVIDERS_DOCKER=true
   - TRAEFIK_API_INSECURE=true
   - TRAEFIK_ENTRYPOINTS_FRONT=true
   - TRAEFIK_ENTRYPOINTS_FRONT_ADDRESS=${FRONT_HTTP_PORT:-9090}

 ajax: 
  image: "infra/ajax"
  deploy:
   replicas: 2
  labels: 
   - traefik.enable=true
   - traefik.http.routers.ajax.rule=PathPrefix(`/`)
   
 express: 
  image: "infra/express"
  deploy:
   replicas: 2
  labels: 
   - traefik.enable=true
   - traefik.http.services.express.loadbalancer.server.port=3000
   - traefik.http.routers.express.rule=PathPrefix(`/api/json/`)
   - traefik.http.routers.express.middlewares=express-replacepath
   - traefik.http.middlewares.express-replacepath.replacepath.path=/
```
On définit ici trois micro-services: traefik (notre reverse proxy), ajax (web-static), express (web-dynamic). On utilise les images
crééent aux étapes précédentes.
On fait ensuite du port forwarding :
```
ports:
   - "${FRONT_HTTP_PORT:-9090}:80"
   - "8080:8080"
```
Puis, on ajoute un volume pour dire à traefik d'aller écouter les évènements sur le socket Docker.
```
volumes:
   - /var/run/docker.sock:/var/run/docker.sock
```
On ajoute ensuite les variables d'environnement :
- les containers ne sont pas exposés à traefik par défaut,
- traefik doit utiliser docker comme provider et utiliser son API pour gérer dynamiquement l'infrastructure,
- activation de l'interface graphique,
- ajout d'un point d'entrée des requêtes qui écoutera sur le port 9090.

Le service ajax utilise l'image infra/ajax. Docker va déployer ensuite 2 conteneurs basés sur cette image. On expose le service à traefik et lorsqu'une requête 
HTTP est faite à la racine du point d'entrée, il y a une redirection sur ce service (on verra donc le site web).

```
 ajax: 
  image: "infra/ajax"
  deploy:
   replicas: 2
  labels: 
   - traefik.enable=true
   - traefik.http.routers.ajax.rule=PathPrefix(`/`)
```
Même chose avec express, mais cette fois les règles sont légèrement différentes. Les requêtes HTTP à "nom_de_domaine/api/json/" seront redirigées sur le port 3000 
et à la racine du service express. 
```
 express: 
  image: "infra/express"
  deploy:
   replicas: 2
  labels: 
   - traefik.enable=true
   - traefik.http.services.express.loadbalancer.server.port=3000
   - traefik.http.routers.express.rule=PathPrefix(`/api/json/`)
   - traefik.http.routers.express.middlewares=express-replacepath
   - traefik.http.middlewares.express-replacepath.replacepath.path=/
```
Une fois cela fait, il faut démarrer l'infrastructure avec la commande `docker compose up`.

### Résultats
En accédant à localhost:8080, le navigateur affiche bien l'interface graphique de Traefik.

![image](/)

En accédant à localhost:9090, le navigateur affiche bien le site web "statique".

![image](/)

En accédant à localhost:9090/api/json/, le navigateur affiche correctement les données JSON récupérées.

![image](/)



