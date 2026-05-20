# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Declare ARGs for Vite environment variables
ARG VITE_GOOGLE_CALENDAR_API_KEY
ARG VITE_SHARED_CALENDAR_ID
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set ENV variables for the build process (Vite bakes these into the static files)
ENV VITE_GOOGLE_CALENDAR_API_KEY=$VITE_GOOGLE_CALENDAR_API_KEY
ENV VITE_SHARED_CALENDAR_ID=$VITE_SHARED_CALENDAR_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Production stage - using Nginx to serve the static files
FROM nginx:alpine

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add a simple nginx configuration for React Router (Single Page Application)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
