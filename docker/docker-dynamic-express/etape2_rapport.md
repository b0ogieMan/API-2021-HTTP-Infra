# API - Labo HTTP
## Étape 2
### Description
### Marche à suivre

Il faut dans un premier temps créer un répertoire (que nous nommerons **docker-dynamic-express**) à l'endroit où vous souhaitez réaliser l'étape (idéalement dans le même répertoire où se trouve le dossier de l'étape 1). 

Puis, se rendre dans ce répertoire au moyen de la commande `cd <nom_du_répertoire>`.

Une fois dedans, créer un fichier Dockerfile (`touch Dockerfile`) et un répertoire *content* 
(`mkdir content`).

Se rendre dans le répertoire *content* et y exécuter les commandes suivantes :
```
npm init # va permettre de générer un fichier package.json
npm install --save chance # permet d'installer le module Chance utilisé lors de cette étape
npm install --save express # permet d'installer le module Express utilisé pour créer un serveur
```
Créer également un fichier *index.js* (`touch index.js`) et y insérer les instructions suivantes :

```js
// On dit qu'on utilise le module Chance qui permet de générer des données aléatoirement
var Chance = require('chance');
var chance = new Chance();

const express = require('express')
const app = express()

/* Lors d'un accès à la racine du site, le serveur va générer une charge utile JSON et la renvoyer */
app.get('/', (req, res) => {
  res.send(generateJSON());
});

/* Le serveur écoute les arrivées sur le port 3000 */
app.listen(3000, () => {
  console.log('Accepting HTTP requests on port 3000.');
});

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

```
Tester le code à l'aide de la commande `node index.js`. La console devrait afficher: `Accepting HTTP requests on port 3000`. Si on accède à `localhost:3000`, le navigateur affiche également le tableau JSON.

Retourner dans le répertoire un niveau plus haut (`cd ..`) et insérer les lignes suivantes dans le fichier Dockerfile :

```
FROM node:16

COPY content/ /opt/app

CMD ["node", "/opt/app/index.js"]
```

Une fois cela fait, l'image peut être créée. Pour se faire, exécuter la commande suivante dans le même répertoire que le fichier Dockerfile :
```
docker build -t infra/dynamic .
```

Après la construction de l'image, il est possible de démarrer un conteneur basé sur cette dernière. Utiliser la commande : 

```
docker run -d -p 3000:3000 --name express_dynamic infra/dynamic
```

Une fois encore, on peut vérifier le comportement en se rendant sur l'adresse `localhost:3000`.
On y reçoit bien la charge utile JSON qui est générée aléatoirement et de taille différente à chaque rafraîchissement.


