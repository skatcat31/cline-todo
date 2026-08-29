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
# Runtime image – serve the built files with a lightweight server.
# Instead of letting the nginx master run as root, the whole process runs
# as the unprivileged "nginx" user (shipped with the image) on high port
# 8080, so the container needs no privileged capabilities at all.
FROM nginx:alpine AS runtime

# Non-root configuration: no "user" directive, stdout/stderr logging,
# /tmp pid file, listening on 8080.
COPY nginx.conf /etc/nginx/nginx.conf

# The built app (read-only assets are enough for the nginx user)
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the (unprivileged) HTTP port
EXPOSE 8080

# nginx:alpine ships busybox, which includes wget – probe the index page.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1

# Drop privileges: master and workers all run as this user
USER nginx

CMD ["nginx", "-g", "daemon off;"]