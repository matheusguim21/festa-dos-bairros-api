FROM node:22-alpine

# Habilita o pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copia apenas os arquivos necessários primeiro (melhor cache)
COPY package.json pnpm-lock.yaml ./

# Instala dependências
RUN pnpm install --frozen-lockfile

# Copia o restante do código
COPY . .

# Gera o cliente do Prisma
RUN pnpm exec prisma generate

# Compila a aplicação NestJS
RUN pnpm run build

# Aponta o comando de start
CMD ["node", "dist/main.js"]
