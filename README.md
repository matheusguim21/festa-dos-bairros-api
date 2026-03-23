# Festa dos Bairros API

API NestJS para **gestão de estoque e vendas** da Festa dos Bairros da Igreja Verbo da Vida Retiro: barracas (stalls), produtos, pedidos, integração com pagamentos via microserviço e tempo real com **Socket.IO**.

## Stack

- **NestJS** (HTTP Express)
- **Prisma** + **PostgreSQL**
- **JWT** (par de chaves RSA + segredo)
- **Socket.IO** (`@nestjs/platform-socket.io`, `@nestjs/websockets`)
- Exportação/planilhas: **exceljs**, **write-excel-file**
- Validação com **Zod**

## Pré-requisitos

- Node.js
- [pnpm](https://pnpm.io)
- Docker (opcional, para subir o Postgres do repositório)

## Banco de dados local (Docker)

O `docker-compose.yml` sobe PostgreSQL (imagem Bitnami) com usuário, senha e banco definidos no compose. Suba os serviços antes de rodar migrações:

```bash
docker compose up -d
```

Monte a `DATABASE_URL` no `.env` de acordo com host, porta, usuário, senha e nome do banco **do seu compose** (a porta publicada no arquivo é **5433**).

> O arquivo `.env.example` pode precisar ser alinhado manualmente a esse compose (URL, credenciais e porta).

## Configuração

1. Copie e edite o ambiente:

   ```bash
   cp .env.example .env
   ```

2. Preencha pelo menos:

   - `DATABASE_URL`
   - `JWT_SECRET`, `JWT_PUBLIC_KEY`, `JWT_PRIVATE_KEY`
   - `PORT` (padrão típico **3333** se omitido no schema)
   - `PAYMENTS_MS_URL` — URL do microserviço de pagamentos
   - `INTERNAL_PAYMENTS_HMAC_SECRET` — mesmo valor configurado no payments-ms para esta aplicação (festa)

3. Prisma:

   ```bash
   pnpm exec prisma migrate dev
   ```

4. Seeds (opcional):

   ```bash
   pnpm run prisma:seed
   # ou
   pnpm run prisma:seed:bun
   ```

## Executar

O script `dev` sobe o Docker em background e inicia o Nest em watch:

```bash
pnpm install
pnpm run dev
```

Se o banco já estiver rodando e você não quiser o `docker compose` automático:

```bash
pnpm exec nest start --watch
```

Outras opções:

- `pnpm run dev:bun` — watch com Bun
- `pnpm run build` — build + `tsc-alias`
- `pnpm run start:bun` — executa o build com Bun

A API escuta em `0.0.0.0` na porta definida por `PORT`. CORS está habilitado de forma aberta no bootstrap (`enableCors()`); restrinja em produção se necessário.

## Estrutura (visão geral)

- `src/infra` — `AppModule`, configuração, HTTP, autenticação
- `prisma/` — schema e scripts de seed/clear
- Client Prisma gerado em `src/generated/prisma`

## Scripts úteis

| Script              | Descrição        |
| ------------------- | ---------------- |
| `pnpm run lint`     | ESLint           |
| `pnpm run format`   | Prettier         |
| `pnpm run prisma:clear` | Limpa dados |

---

Licença: MIT (ver `package.json`).
