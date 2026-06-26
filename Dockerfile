# Node image
FROM node:lts

# Install Chromium and dependencies for the sandbox
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    libcap2-bin \
    --no-install-recommends \
&& rm -rf /var/lib/apt/lists/*

# Configure the Chromium sandbox with SUID
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox
RUN if [ -f "$CHROME_DEVEL_SANDBOX" ]; then \
        chown root:root "$CHROME_DEVEL_SANDBOX" && \
        chmod 4755 "$CHROME_DEVEL_SANDBOX"; \
    fi

# Set working directory and permissions for the node user
WORKDIR /app
RUN chown -R node:node /app

# Run as non-root user
USER node