# API - Labo HTTP
## Étape 5
### Description
### Marche à suivre

Créer fichier apache2-foreground
```
#!/bin/bash
set -e

# Add setup for API
echo "Setup for API lab..."
echo "Static App: $STATIC_APP"
echo "Dynamic App: $DYNAMIC_APP"

php /var/apache2/templates/config-template.php > /etc/apache2/sites-available/001-reverse-proxy.conf

# Apache gets grumpy about PID files pre-existing
rm -rf /var/run/apache2/apache2.pid

exec apache2ctl -DFOREGROUND
```

Créer fichier Dockerfile
```
FROM php:7.2-apache

RUN apt-get update && apt-get install vim -y

COPY apache2-foreground /usr/local/bin/
RUN chmod +x /usr/local/bin/apache2-foreground 

COPY conf/ /etc/apache2/
COPY templates /var/apache2/templates

RUN a2enmod proxy proxy_http
RUN a2ensite 000-* 001-*
```
Créer un dossier templates
Créer un fichier config-template.php
```
<?php
    $static_app = getenv('STATIC_APP');
    $dynamic_app = getenv('DYNAMIC_APP');
?>

<VirtualHost *:80>
    ServerName infra.lab

    ProxyPass '/api/json/' 'http://<?php print "$dynamic_app"?>/'
    ProxyPassReverse "/api/json/" "http://<?php print "$dynamic_app"?>/'


    ProxyPass '/' 'http://<?php print "$static_app"?>/'
    ProxyPassReverse '/ '<?php print "$static_app"?>/'

</VirtualHost>
```

Démarrer plusieurs instances de infra/static et infra/dynamic
Récupérer les IPs avec docker inspect <name>


Démarrer le reverse_proxy
```
docker run -d -e STATIC_APP=172.17.0.5:80 -e DYNAMIC_APP=172.17.0.8:3000 --name apache_dynrp -p 8080:80 infra/dynamic_rp
```





