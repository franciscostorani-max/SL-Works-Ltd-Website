FROM node:22-slim

WORKDIR /app

# Install frontend deps and build
COPY frontend/package.json frontend/
RUN cd frontend && npm install

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Install backend deps (production only)
COPY backend/package.json backend/
RUN cd backend && npm install --omit=dev

COPY backend/ backend/
COPY package.json .

# Data directory — Fly volume mounts here at runtime
RUN mkdir -p /data

ENV PORT=8080
ENV DATA_DIR=/data
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "backend/server.js"]
