FROM node:20-alpine
WORKDIR /app

# Copy the root workspace configuration
COPY package*.json ./

# Copy the shared database package and the indexer package
COPY packages/db ./packages/db
COPY packages/indexer ./packages/indexer

# Install all dependencies (npm will automatically link the local workspaces)
RUN apk add --no-cache openssl
RUN npm install

# Generate the Prisma Client and build the package
RUN npm run db:generate --workspace=packages/db
RUN npm run build --workspace=packages/indexer

# Start the indexer
CMD ["npm", "run", "start", "--workspace=packages/indexer"]