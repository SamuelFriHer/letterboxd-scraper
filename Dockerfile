# Imagen de Node
FROM node:lts

# Instalar Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends \
&& rm -rf /var/lib/apt/lists/*

# Establecer el directorio de trabajo
WORKDIR /app