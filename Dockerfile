FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY src ./src
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV PORT=7331
EXPOSE 7331

# Entrypoint chowns the bind-mounted /app/data dir (host volume may be
# root-owned when Docker creates the empty host dir), then runs the app.
# Self-hosted single-user app: running as root inside the container is
# acceptable and avoids the chicken-and-egg of chown needing root while
# the bun user can't elevate to do it.
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "run", "src/index.ts"]
