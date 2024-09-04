ARG NODE_VERSION=20.11.0

FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine AS base
LABEL fly_launch_runtime="Next.js/Prisma"

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install Prisma Client - remove if not using Prisma

COPY prisma ./prisma

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i

COPY . .
COPY example.env .env

RUN pnpm build

EXPOSE 3000

ENV PORT 3000

# Run the migration script
# RUN chmod +x ./scripts/migrate.sh
# ENTRYPOINT [ "./scripts/migrate.sh" ]

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD [ "pnpm start" ]
