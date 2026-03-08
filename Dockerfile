# Imagen de Node
FROM node:lts

# Instalar Chromium y dependencias para el sandbox
RUN apt-get update && apt-get install -y \
    chromium \
    libcap2-bin \
    --no-install-recommends \
&& rm -rf /var/lib/apt/lists/*

# Establecer el directorio de trabajo y permisos para el usuario node
WORKDIR /app
RUN chown -R node:node /app

# Ejecutar como usuario no raíz
USER node