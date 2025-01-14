# API - Labo HTTP
Auteurs : Anthony Coke, Francesco Monti

## Etape 1: Serveur HTTP statique avec apache httpd
Nous avons décidé d'utiliser l'image *php:8.0-apache*. Le dossier contenant le site web statique est copié dans le répertoire
`/var/www/html` du conteneur.

Le fichier Dockerfile contient :
```dockerfile
FROM php:8.0-apache

RUN apt-get update && apt-get install -y vim

COPY content/ /var/www/html/

EXPOSE 8080
```
**Explications**: l'image construite est basée sur php:8.0-apache. Le noyau est mis à jour et l'outil *vim* est installé. Le contenu du répertoire *content/* est copié dans le container à l'emplacement `/var/www/html/`. Finalement, le port *8080* est exposé (utile pour la communication inter-container). 

L'image peut être construite à l'aide de la commande suivante dans le répertoire contenant le Dockerfile :

```sh
docker build -t api/static .
```
Une fois cela fait, le container peut être démarré 

```sh
docker run -p 8080:80 api/static
```

La configuration apache est celle par défaut, configurée par l'image _php:8.0-apache_.

### Résultat
Maintenant, il peut être accédé via [localhost:8080](http://localhost:8080). 

![résultats_step1_OK](step1-static/figures/step1-check-static-OK.png)

## Etape 2: Serveur HTTP dynamique avec fastify.js

Le fichier server.js permet de créer un serveur utilisant le module Fastify.

```js
/* On dit qu'on utilise le module Chance qui permet de générer des données aléatoirement et Fastify*/
import Chance from 'chance';
import Fastify from 'fastify';

/* Construit un serveur Fastify */
const fastify = Fastify({
   logger: true
});
const chance = Chance();
const port = process.env.PORT; // récupère le port dans la variable d'environnement PORT

/* Lors d'un accès à la racine du site, le serveur va générer une charge utile JSON et la renvoyer */
fastify.get('/', (request, reply) => {
   reply.send(generateJSON());
});

/* Le serveur écoute les requêtes sur le port spécifié dans la variable d'environnement */
const start = async () => {
   try {
      await fastify.listen(port, '0.0.0.0')
   } catch (err) {
      fastify.log.error(err)
      process.exit(1)
   }
}

/* Fonction qui génère une charge utile JSON avec des informations sur des vols de la compagnie aérienne United */
function generateJSON() {

	var numberOfPlanes = chance.integer({
		min: 0,
		max: 10
	});
	console.log(numberOfPlanes);
	var planes = [];
	for (var i = 0; i < numberOfPlanes; ++i) {
	
		var airline = "United";
		var callsign = airline.toUpperCase() + chance.integer({min:1, max:45});
		var flightId = chance.hash({length: 6, casing: 'upper'})
		var currentCoords = chance.coordinates();
		var currentTimeZone = chance.timezone();
		var pilot = chance.name();
		var licenseExpireDate = chance.year({min: 2005, max: 2035});
		
		planes.push({
			airline: airline,
			callsign: callsign,
			flightId: flightId,
			currentCoords: currentCoords,
			currentTimeZone: currentTimeZone,
			pilot: pilot,
			licenseExpireDate: licenseExpireDate
		});
		
	};
	console.log(planes);
	return planes;
}

// Démarre le serveur
start();

```
Le fichier est ensuite placé dans le répertoire `content` qui sera copié dans le container.

Pour démarrer le serveur, nous utilisons cette fois un fichier `docker-compose.yml`. 
```yml
version: '3'
services:
  fastify:
    container_name: fastify-dynamic
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
```
Nous définissons un service *fastify*, chaque container de ce service utilisera l'image construite à l'aide du Dockerfile dans le répertoire courant. Le service est accessible via le port 3000. Et nous définissons une variable d'environnement PORT qui a comme valeur 3000. Celle-ce va informer le serveur `JS` que le port souhaité est celui-là.

```dockerfile
FROM node:alpine

WORKDIR /opt/app

COPY --chown=node:node ./content/package*.json ./

RUN npm install

COPY --chown=node:node ./content .

USER node

ENTRYPOINT [ "node", "server.js" ]
```
Nous avons au préalable généré des fichiers `package.json` (et donc `package-lock.json`) avec `npm install fastify chance`. Ces derniers permettront d'installer toutes les dépendances lors de l'exécution de la commande `npm install` dans le container. La raison de copier d'abord les fichiers _package*.json_ est que si nous modifions uniquement le contenu du serveur (les fichiers js, etc.) nous n'avons pas besoin de rebuild l'image entière. Nous pouvons profiter de la mise en cache de Docker des différentes étapes lors du build de l'image. De cette manière, les étapes jusqu'à `RUN npm install` seront beaucoup plus rapides, car déjà en cache.

Tous les fichiers du répertoire `content` sont copiés dans le répertoire de travail du container, c'est-à-dire `/opt/app`. Finalement, le fichier `server.js` est exécuté.

La commande `USER` permet de définir l'utilisateur qui lancera la commande du container. Ici, nous passons de root à node.

Pour démarrer le container en mode détaché, utiliser la commande suivante :
```sh
docker compose up -d
```
Pour arrêter tous les containers :
```sh
docker compose down
```

### Résultat
À chaque rafraîchissement de [localhost:3000](localhost:3000), les données affichées sont bien différentes.

![résultats_step2_OK](figures/step2-OK.gif)


## Etape 3: Reverse proxy avec apache (configuration statique)

Nous utilisons ici un serveur php-apache comme reverse proxy. 

```dockerfile
FROM php:8-apache

RUN apt-get update && apt-get install vim -y

COPY conf/ /etc/apache2/

RUN a2enmod proxy proxy_http

RUN a2ensite 000-* 001-*
```
Nous copions tout le contenu du répertoire `conf/` dans `/etc/apache2/`. Cela va donc transférer tous les fichiers de configuration des hôtes virtuels. Puis, nous activons les modules proxy et proxy_http qui nous permettrons de mettre en place le routage. Finalement, nous activons les hôtes virtuels commençant par 000-* et 001-*, cela aura pour effet de copier les fichiers de configuration dans le répertoire `/etc/apache2/sites-enable`.

Le fichier de configuration *001-reverse-proxy.conf* permet de configurer le routage du proxy. Si l'URL correspond à *localhost:XXXX/api/json*, il y aura une redirection vers le container dynamic. Si l'URL correspond à la racine du nom de domaine, cette fois la requête ira vers le serveur statique.

```ApacheConf
<VirtualHost *:80>
	
	ServerName localhost

	ProxyPass "/api/json" "http://dynamic:3000/"
	ProxyPassReverse "/api/json" "http://dynamic:3000/"
	
	ProxyPass "/" "http://static:80/"
	ProxyPassReverse "/" "http://static:80/"
	

	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined
	
</VirtualHost>
```
Cette configuration est toutefois moins fragile que celle présentée dans les webcasts (utiliser l'ip des containers plutôt que leur nom) et un peu plus dynamique.
Si l'URL ne correspond pas à celles spécifiées précédemment, le serveur ne renvoit rien (fichier `000-default.conf`). 

```ApacheConf
<VirtualHost *:80>
</VirtualHost>
```

Nous utilisons encore une fois un fichier `docker-compose.yml` pour démarrer l'infrastructure.

```yml
version: '3'
services:
  reverse-proxy:
    container_name: reverse-proxy
    build: ./reverse-proxy
    ports:
      - "8080:80"
    depends_on:
      - static
      - dynamic
  static:
    container_name: static
    build: ./static
  dynamic:
    container_name: dynamic
    build: ./dynamic
    environment:
      - PORT=3000
```

Le fichier est similaire à celui de l'étapte précédente, mais cette fois 3 services sont déclarés. Le seul service accessible par l'extérieur grâce au port-forwarding est le reverse-proxy. Pour les deux autres, aucune règle n'est spécifiée, mais bien évidemment les containers pourront tout à fait communiquer et recevoir des requêtes à l'intérieur du réseau. Comme aucune exposition de ports n'est spécifiée pour les deux services "internes" il ne seront pas accessibles de l'extérieur. On peut le voir en essayant d'accéder à _localhost:80_ et _localhost:3000_ sans succès.

Pour démarrer l'infrastructure en mode détaché, utiliser la commande suivante :
```sh
docker compose up -d
```
Pour arrêter tous les containers :
```sh
docker compose down
```

### Résultats

Si l'on accède à [localhost:8080/api/json](localhost:8080/api/json) les données JSON générées aléatoirement sont affichées, tandis qu'en accédant à [localhost:8080](localhost:8080) le site web statique s'affiche correctement.

![résultats_step3_OK](figures/step3-OK.gif)

## Etape 4: Requêtes AJAX avec JQuery

Le code du fichier `index.html` du site a été modifié et une classe a été ajoutée à la balise *<p>*. Cette classe permettra de sélectionner le paragraphe et en changer les propriétés grâce au script.

```html
	<header id="fh5co-header" class="fh5co-cover js-fullheight" role="banner">
		<div class="overlay"></div>
		<div class="container">
			<div class="row">
				<div class="col-md-8 col-md-offset-2 text-center">
					<div class="display-t js-fullheight">
						<div class="display-tc js-fullheight animate-box" data-animate-effect="fadeIn">
              
							<h1>Welcome to my API website !</h1>
							<h2>I hacked the FAA, so now I can access the coords of every flight ! Here is an example ...</h2>
							<p class="json-app">There's nothing here ... :(</p>
              
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>
```

À la fin du fichier `index.html`, il faut bien évidemment indiquer où aller chercher le script JS qui s'occupera de mettre à jour la page.

```html
	<!-- Custom script to load flights information -->
	<script src="js/flights.js"></script>

	</body>
</html>

```

Le script `flight.js` suivant exécute la fonction *loadFlights()* toutes les 2 secondes. Cette dernière va récupérer les données JSON en faisant une requête GET à l'URL `/api/json`. S'il y a des données à afficher, un message sera composé avec les données du premier vol du tableau JSON. Finalement, le texte contenu dans la balise utilisant la classe `json-app` est mis à jour.

```js
$(function() {
	console.log("Loading flights...");
	
	function loadFlights() {
		$.getJSON("/api/json", function( flights ) {
			console.log(flights);
			var message = "No flights recorded...";
			if (flights.length > 0) {
				message = "Airline: " + flights[0].airline + ", Callsign:  " +
					flights[0].callsign + ", FlightId: " + 
					flights[0].flightId + ", Current Coords: " +
					flights[0].currentCoords + ", Pilot Name: " + 
					flights[0].pilot + ", License Expiration Date: " +
					flights[0].licenseExpireDate; 
			}
			$(".json-app").text(message);
		});
	};
	loadFlights();
	setInterval(loadFlights, 2000);
});
```

La configuration de l'infrastructure dans le docker-compose est la même qu'à l'étape précédente. En effet, les seules modifications faites se trouvent dans les fichiers du site web. Il suffit simplement de reconstruire l'image *static* et les changements seront pris en compte. La commande `docker compose build static` permettra de le faire. À noter qu'un simple `docker compose up -d` suffit car _Docker Compose_ détecte le changement de l'image *static*.

### Sans proxy - sécurité
Si nous n'avions pas mis de proxy, le navigateur web ne pourrait pas charger des pages web qui n'auraient pas la même origine à cause de la _Same-Origin Policy_ qui est implémentée de base dans tous les navigateurs afin d'éviter l'exécution potentielle de scripts malicieux. 

### Résultats

En accédant au site web via [localhost:8080](localhost:8080), la page d'accueil est mise à jour toutes les 2 secondes et affiche correctement les données JSON.

![résultats_step4_OK](figures/step4-OK.gif)

Si nous inspectons les requêtes dans l'onglet *Network* des outils développeur du navigateur, nous voyons bien que toutes les 2 secondes une requête est envoyé à `/api/json`.

![résultats_step4_OK](figures/step4-OK2.gif)

## Etape 5: Configuration dynamique du reverse proxy
Les fonctionnalités demandées à cette étape ont déjà été implémentées à l'étape 3 grâce à l'utilisation de _Docker Compose_ et de ses résaux internes.

# Étapes supplémentaires

Pour les prochaines étapes, nous passerons d'un proxy inversé Apache à un proxy implémenté par l'outil Traefik.

Traefik est un reverse-proxy HTTP très moderne qui permet de gérer facilement le routage et la répartition de charge. Il dispose de plein d'autres fonctionnalités très intéressantes et utiles.

## Répartition de charge : plusieurs noeuds serveurs

Nous nous basons sur l'état final de l'étape 5, c'est-à-dire que les images et le contenu des répertoires `dynamic/` et `static/` n'ont pas changé.

Nous utilisons donc un fichier `docker-compose.yml`. 

```yml
services: 
 traefik: 
  image: "traefik:v2.5"
  command: --api.insecure=true --providers.docker
  ports:
   - "9090:80"
   - "8080:8080"
  volumes:
   - /var/run/docker.sock:/var/run/docker.sock
  environment:
   - TRAEFIK_PROVIDERS_DOCKER_EXPOSEDBYDEFAULT=false
   - TRAEFIK_ENTRYPOINTS_FRONT=true
   - TRAEFIK_ENTRYPOINTS_FRONT_ADDRESS=9090
```
Nous définissons un service qui utilisera l'image de traefik. Les commandes permettent d'activer l'interface utilisateur et de dire à traefik qu'il doit écouter les évènements et récupérer les données grâce à l'API docker. Il faut pour cela ajouter le volume `/var/run/docker.sock:/var/run/docker.sock`. Le port forwarding "8080:8080" permet d'accéder à l'interface de gestion via [localhost:8080](localhost:8080) et "9090:80" servira à se rendre sur le [site web](localhost:9090).

Puis, nous ajoutons des variables d'environnement pour désactiver l'exposition par défaut, activer l'utilisation de docker comme provider, activer un entrypoint front et spécifier le port d'accès à cet entrypoint.

```yml
deploy:
 replicas: 2
```
Cela permet de démarrer deux containers avec la même image. On pourrait également ne pas mettre ces deux lignes et mettre `--scale static=2` et `--scale dynamic=2` dans la commande _Docker Compose_.

```yml
  labels: 
   - traefik.enable=true
   - traefik.http.services.static.loadbalancer.server.port=80
   - traefik.http.routers.static.rule=PathPrefix(`/`)
```
Le service est exposé à traefik (pour qu'il puisse le gérer dynamiquement), puis le port de communication (*:80*) utilisé par le container. Le dernier label sert à déclarer un router qui redirigera la requête HTTP sur ce service si la requête tente d'accéder à la racine du nom de domaine.

```yml
  labels: 
   - traefik.enable=true
   - traefik.http.services.dynamic.loadbalancer.server.port=3000
   - traefik.http.routers.dynamic.rule=PathPrefix(`/api/json`)
   - traefik.http.routers.dynamic.middlewares=dynamic-replacepath
   - traefik.http.middlewares.dynamic-replacepath.replacepath.path=/
```
Les règles sont relativement similaires pour le service _dynamic_, mais cette fois lorsqu'une requête est envoyée à `/api/json`, le routeur va la modifier à l'aide d'un middleware pour qu'elle soit redirigée à la racine du service.

**Fichier final:**
```yml
version: "3"

services: 
 traefik: 
  image: "traefik:v2.5"
  command: --api.insecure=true --providers.docker
  ports:
   - "9090:80"
   - "8080:8080"
  volumes:
   - /var/run/docker.sock:/var/run/docker.sock

  environment:
   - TRAEFIK_PROVIDERS_DOCKER_EXPOSEDBYDEFAULT=false
   - TRAEFIK_ENTRYPOINTS_FRONT=true
   - TRAEFIK_ENTRYPOINTS_FRONT_ADDRESS=9090

 static:
  build: ./static
  deploy:
   replicas: 2
  labels: 
   - traefik.enable=true
   - traefik.http.services.static.loadbalancer.server.port=80
   - traefik.http.routers.static.rule=PathPrefix(`/`)
   
 dynamic: 
  build: ./dynamic
  deploy:
   replicas: 2
  labels: 
   - traefik.enable=true
   - traefik.http.services.dynamic.loadbalancer.server.port=3000
   - traefik.http.routers.dynamic.rule=PathPrefix(`/api/json`)
   - traefik.http.routers.dynamic.middlewares=dynamic-replacepath
   - traefik.http.middlewares.dynamic-replacepath.replacepath.path=/
  environment:
  - PORT=3000
```

L'infrastructure peut être démarrée avec `docker compose up`.

### Résultats

Après lancement de l'infrastructure et chargement du site, nous voyons que traefik répartit la charge automatiquement entre les deux serveurs dynamique via les logs dans la console.

![résultats_step6_OK](figures/step6-OK.gif)

De même pour les serveurs statiques, c'est certes très rapide, mais nous voyons clairement que traefik envoit certaines requêtes à l'un et d'autres à l'autre à chaque rafraîchissement de la page.

![résultats_step6_OK2](figures/step6-OK-2.gif)


## Répartition de charge : round-robin vs sticky sessions

Deux labels ont été rajoutés dans chaque service (static et dynamic) pour activer les sticky sessions :

```yml
   - traefik.http.services.dynamic.loadbalancer.sticky=true
   - traefik.http.services.dynamic.loadbalancer.sticky.cookie.name=<Nom_désiré>
```

L'infrastructure peut être démarrée avec `docker compose up`.

### Résultats

En chargant pour la première fois le site web, nous voyons dans l'onglet *Network* que le serveur envoie dans sa réponse un cookie au client. Lors d'un rafraîchissement, le cookie est envoyé au serveur par le client. Le comportement est le même en testant avec [localhost:8080/api/json](http://localhost:8080/api/json).

![résultats_step7_OK](figures/step7-OK.gif)

## Gestion dynamique du cluster

La fonctionnalité demandée dans cette étape est déjà implémentée à l'étape *Répartition de charge : plusieurs noeuds serveurs*. Nous avons toutefois décidé de tester une autre méthode.

Nous avons retiré les lignes suivantes des différents services dans le fichier docker-compose.

```yml
  deploy:
   replicas: 2
```

À la place, nous démarrons l'infrastructure en ajoutant `--scale <nom_service>=<nbr_container>`. 

```sh
docker compose up -d --scale static=3 --no-recreate --scale dynamic=3 --no-recreate
```
Une fois l'infrastructure opérationnel, il est possible de modifier le nombre d'instances d'un service en insérant à nouveau la commande 

```sh
docker compose up -d --scale static=3 --no-recreate --scale dynamic=5 --no-recreate
```
Cela aura pour effet d'ajouter 2 containers au service dynamic sans recréer les anciens déjà lancés.

| :warning: 	| Bug possible avec le flag *--no-recreate* |
| :-----------:	| ------------- |
| Lien 		| [https://github.com/docker/compose/issues/8940](https://github.com/docker/compose/issues/8940)  |
| Solution possible | Redémarrer le service docker `systemctl restart docker.service` et réessayer |

### Résultats

En spécifiant un nouveau nombre d'instances d'un service, docker va recréer les containers du service dynamic qui étaient déjà présents et créer 1 nouveau container qu'il rajoutera à l'infrastructure.

![résultats_step8_OK](figures/step8-OK.gif)

## Interface de gestion utilisateur

Nous avons simplement ajouté un nouveau service dans le fichier docker-compose de l'étape précédente :

```yml
 portainer:
  image: portainer/portainer-ce:latest
  container_name: portainer
  restart: unless-stopped
  volumes:
    - /etc/localtime:/etc/localtime:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
  ports:
    - 9000:9000
```

Il faut impérativement ajouter le volume `/var/run/docker.sock:/var/run/docker.sock:ro` pour que Portainer puisse récupérer les informations depuis Docker.

L'infrastructure peut être démarrée avec `docker compose up -d --scale static=<nbr_d'instances_désirées> --scale dynamic=<nbr_d'instances_désirées>`. Un seul container portainer sera démarré.

### Résultats

En accédant à l'adresse [localhost:9000](http://localhost:9000), le portail portainer s'affiche, il est possible de créer un mot de passe pour le compte admin. Une fois cela fait, dans l'onglet Home, il est possible de sélectionner l'environnement local et d'obtenir des informations sur celui-ci.

Dans un cas de production le container Portainer serait soit lancé individuellement, soit même installé en dur sur le noeud. Ceci permet de configurer Portainer une fois au début et ensuite juste se connecter avec l'utilisateur/mot de passe défini. On pourrait mapper le dossier `/data` de Portainer sur un dossier de l'hôte pour sauvegarder les configurations. Il faudra par contre aussi mapper le dossier courant afin que Portainer puisse accéder aux fichiers si l'on souhaite lancer des containers depuis là.

![résultats_step9_OK](figures/step9-OK.gif)


