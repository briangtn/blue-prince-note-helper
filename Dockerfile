FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache tini
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ server/
COPY src/api/roomCatalog.js src/api/roomCatalog.js
COPY --from=build /app/dist dist/

RUN mkdir -p /data
ENV PORT=3001
EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["node", "server/index.js"]
