# Use an official lightweight Node image
FROM node:20-alpine AS builder

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

CMD ["nginx", "-g", "daemon off;"]