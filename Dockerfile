FROM node:22-alpine

WORKDIR /app

# Ativa o pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia arquivos essenciais primeiro para aproveitar o cache
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Copia o restante do código
COPY . .

# Gera os arquivos do Prisma
RUN pnpm exec prisma generate

# Compila o NestJS (gera `dist/`)
RUN pnpm run build

# Inicia a aplicação
CMD ["pnpm", "run", "start"]
