FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY policy ./policy
COPY engine ./engine
COPY license ./license
COPY cli ./cli

# Set environment
ENV NODE_ENV=production

# Run with native TypeScript support
ENTRYPOINT ["node", "--experimental-strip-types", "cli/index.ts"]
CMD ["--help"]
