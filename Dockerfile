FROM node:20-alpine

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install and build client
COPY client/package*.json ./client/
RUN npm ci --prefix client

COPY client/ ./client/
RUN npm run build

# Copy server source
COPY server/ ./server/

EXPOSE 3001

CMD ["node", "server/index.js"]
