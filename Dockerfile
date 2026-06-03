FROM oven/bun:1-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

RUN bun install --ignore-scripts

COPY . .

RUN bunx prisma generate
RUN bun run build

CMD ["bun", "run", "start:bun"]
