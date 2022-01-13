FROM php:8-apache

RUN apt-get update && apt-get install vim -y

COPY conf/ /etc/apache2/

RUN a2enmod proxy proxy_http

RUN a2ensite 000-* 001-*