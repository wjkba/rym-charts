FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src ./src

ENV NODE_ENV=production
ENV PORT=7331
EXPOSE 7331

USER bun

CMD ["bun", "run", "src/index.ts"]
