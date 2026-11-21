# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

RUN npm ci

# Copy source code and configuration
COPY . .

ARG VITE_NPF_CORE_MANAGER_API_URL=/api/v1
ENV VITE_NPF_CORE_MANAGER_API_URL=$VITE_NPF_CORE_MANAGER_API_URL

# Build application
RUN npm run build

# Stage 2: Serve static assets with Nginx
FROM nginx:1.27-alpine AS runtime

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
