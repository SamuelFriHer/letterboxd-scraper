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
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox
RUN if [ -f "$CHROME_DEVEL_SANDBOX" ]; then \
        chown root:root "$CHROME_DEVEL_SANDBOX" && \
        chmod 4755 "$CHROME_DEVEL_SANDBOX"; \
    fi

# Establecer el directorio de trabajo y permisos para el usuario node
WORKDIR /app
RUN chown -R node:node /app

# Ejecutar como usuario no raíz
USER node