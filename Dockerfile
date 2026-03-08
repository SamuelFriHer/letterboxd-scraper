# Imagen de Node
FROM node:lts

# Instalar Chromium y dependencias para el sandbox
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    libcap2-bin \
    --no-install-recommends \
&& rm -rf /var/lib/apt/lists/*

# Configurar el sandbox de Chromium con SUID
RUN if [ -f /usr/lib/chromium/chrome-sandbox ]; then \
        chown root:root /usr/lib/chromium/chrome-sandbox && \
        chmod 4755 /usr/lib/chromium/chrome-sandbox; \
    fi

# Establecer el directorio de trabajo y permisos para el usuario node
WORKDIR /app
RUN chown -R node:node /app

# Ejecutar como usuario no raíz
USER node