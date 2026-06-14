FROM node:20-alpine
WORKDIR /app

# Copy the root workspace configuration
COPY package*.json ./

# Copy the shared database package and the API package
COPY packages/db ./packages/db
COPY packages/api ./packages/api

# Install all dependencies
RUN apk add --no-cache openssl
RUN npm install

# Generate the Prisma Client and build the package
RUN npm run db:generate --workspace=packages/db
RUN npm run build --workspace=packages/api

# Start the API
CMD ["npm", "run", "start", "--workspace=packages/api"]