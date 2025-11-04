# Etapa de build: compila o frontend (Vite) e prepara artefatos
FROM node:20-alpine AS builder
WORKDIR /app

# Habilita corepack para pnpm
RUN corepack enable

# Copia manifestos e instala dependências (inclui dev deps para build)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copia o restante do projeto e roda build
COPY . .
RUN pnpm run build

# Etapa de runtime: executa Express servindo dist e /api
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable

# Instala apenas prod deps para reduzir imagem
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copia backend, servidor e artefatos estáticos
COPY backend ./backend
COPY server.js ./server.js
COPY dist ./dist

EXPOSE 3000
CMD ["node", "server.js"]