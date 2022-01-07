# API - Labo HTTP
## Étape 7
### Description
L'objectif est de mettre en place des StickySessions et le round-robin sur traefik.

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
   - traefik.http.services.ajax.loadbalancer.sticky=true
   - traefik.http.services.ajax.loadbalancer.sticky.cookie.name=AjaxSticky
   
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
   - traefik.http.services.express.loadbalancer.sticky=true
   - traefik.http.services.express.loadbalancer.sticky.cookie.name=ExpressSticky
```

Deux nouvelles lignes ont été ajoutées dans chaque service :
```
- traefik.http.services.ajax.loadbalancer.sticky=true
- traefik.http.services.ajax.loadbalancer.sticky.cookie.name=AjaxSticky
```
Elles permettent d'activer les StickySessions et donner un nom au cookie.

Une fois cela fait, il faut démarrer l'infrastructure avec la commande `docker compose up`.

Tester avec un navigateur pour voir si cela fonctionne.

### Résultats

En inspectant les interactions dans l'onglet réseau des outils développeurs du navigateur après avoir chargé la page localhost:9090/, il y a un flag Set-Cookie dans la réponse du serveur.

![image]()

Lors d'un rafraîchissement de la page, il n'y a plus ce flag dans la réponse du serveur, mais le client transmet le cookie ExpressSticky dans le header de sa requête.

![image]()

Même chose en accédant à localhost:9090, le serveur envoit un cookie AjaxSticky via Set-Cookie et le client le réutilise à chaque fois qu'il y a un rafraîchissement des données des vols.

![image]()

![image]()





