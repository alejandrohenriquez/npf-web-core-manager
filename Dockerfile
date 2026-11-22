# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

RUN npm ci

# Copy source code and configuration
COPY . .

# Build application
RUN npm run build

# Stage 2: Serve static assets with Nginx
FROM nginx:1.27-alpine AS runtime

ENV NPF_BACKEND_URL=http://192.168.31.30:8010 \
    NPF_CORE_MANAGER_API_URL= \
    VITE_NPF_CORE_MANAGER_API_URL= \
    NGINX_ENVSUBST_FILTER=^NPF_

# Copy custom nginx configuration template (processed via envsubst at container startup)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy build files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Generate /usr/share/nginx/html/env-config.js from container environment variables at startup
RUN printf '#!/bin/sh\nset -e\nTARGET_URL="${NPF_CORE_MANAGER_API_URL:-${VITE_NPF_CORE_MANAGER_API_URL:-${NPF_BACKEND_URL:-}}}"\ncat <<EOF > /usr/share/nginx/html/env-config.js\nwindow.__NPF_CONFIG__ = {\n  API_URL: "${TARGET_URL}"\n};\nEOF\n' > /docker-entrypoint.d/40-generate-env-config.sh && \
    chmod +x /docker-entrypoint.d/40-generate-env-config.sh

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
