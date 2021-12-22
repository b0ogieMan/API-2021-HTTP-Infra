FROM php:7.2-apache

RUN apt-get update && apt-get install vim -y

COPY src/ /etc/apache2/sites-available/

RUN a2enmod proxy && a2enmod proxy_http

RUN a2ensite 001-reverse-proxy.conf
