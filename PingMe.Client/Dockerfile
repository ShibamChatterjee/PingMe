# Stage 1: Build Vite React App
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_HUB_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_TENOR_API_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_HUB_URL=$VITE_HUB_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_TENOR_API_KEY=$VITE_TENOR_API_KEY

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
