# API - Labo HTTP
## Étape 1
### Description
### Marche à suivre

Il faut dans un premier temps créer un répertoire (que nous nommerons **docker-static-apache**) à l'endroit où vous souhaitez réaliser l'étape. 

Puis, se rendre dans ce répertoire au moyen de la commande `cd <nom_du_répertoire>`.

Une fois dedans, créer un fichier Dockerfile (`touch Dockerfile`) et un répertoir *content* 
(`mkdir content`).

Se rendre dans le répertoire *content* et y copier tous les fichiers nécessaires au site web statique. Ici, nous utiliserons le template suivant : ![https://www.free-css.com/free-css-templates/page240/air].

Retourner dans le répertoire un niveau plus haut (`cd ..`) et insérer les lignes suivantes dans le fichier Dockerfile :

```
FROM php:8.0-apache

RUN apt-get update && apt-get install -y vim

COPY content/ /var/www/html/

EXPOSE 8080
```
Une fois cela fait, l'image peut être créée. Pour se faire, exécuter la commande suivante dans le même répertoire que le fichier Dockerfile :
```
docker build -t infra/static .
```

Après la construction de l'image, il est possible de démarrer un conteneur basé sur cette dernière. Utiliser la commande : 

```
docker run -d -p 8080:80 --name apache_static infra/static
```
Celle-ci démarrera une conteneur en mode détaché *-d* accessible sur le port 8080 *-p 8080:80* dont le nom est apache_static *--name* et basé sur l'image fraichement créée infra/static.

L'argument *-p* permet de mapper le port 80 de notre serveur avec le port 8080 de la machine virtuelle Docker. De ce fait, nous pourrons accéder au site web directement depuis le port 8080 comme si nous étions sur le port 80 du serveur apache.

Maintenant, l'accès au site est possible en se rendant sur l'adresse `localhost:8080`.

