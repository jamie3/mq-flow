# syntax=docker/dockerfile:1

# --- Build stage: compile the static site with pnpm ---
FROM node:22-alpine AS build
WORKDIR /app

# Enable pnpm via corepack (bundled with Node 22).
RUN corepack enable

# Install dependencies first (better layer caching).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the static bundle.
COPY . .
RUN pnpm run build

# --- Runtime stage: serve the static files with nginx ---
FROM nginx:1.27-alpine AS runtime

# SPA-friendly config: fall back to index.html for client-side routing.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
