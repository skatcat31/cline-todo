# Use an official lightweight Node image (Node 24 LTS – see .nvmrc)
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies (including dev dependencies for build & test)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . ./

# Build the static site
RUN npm run build

# -----------
# Runtime image (optional) – serve the built files using a lightweight server
FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

# nginx:alpine ships busybox, which includes wget – probe the index page.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]