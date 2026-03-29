FROM php:8.2-cli
RUN apt-get update && apt-get install -y libcurl4-openssl-dev \
    && docker-php-ext-install mysqli curl
COPY . /app
WORKDIR /app
EXPOSE 80
CMD ["php", "-S", "0.0.0.0:80", "-t", "/app"]