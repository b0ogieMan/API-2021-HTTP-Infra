FROM php:7.2-apache

RUN apt-get update && apt-get install vim -y

COPY apache2-foreground /usr/local/bin/
RUN chmod +x /usr/local/bin/apache2-foreground 

COPY conf/ /etc/apache2/
COPY templates /var/apache2/templates

RUN a2enmod proxy proxy_http
RUN a2ensite 000-* 001-*
