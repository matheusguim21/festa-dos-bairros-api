FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build

CMD ["pnpm", "run", "start"]
