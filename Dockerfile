FROM node:18-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent || npm install --silent
COPY . .
RUN npm run build --silent || echo "no build step"

FROM node:18-bullseye
WORKDIR /app
COPY --from=build /app /app
ENV PORT=80
EXPOSE 80
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "80"]
