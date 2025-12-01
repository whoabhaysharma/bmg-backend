# Use the official Node.js 18 image as the base image
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript code
RUN npm run build

# Production image, copy only necessary files
FROM node:18-alpine AS production
WORKDIR /usr/src/app

# Copy only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built app and necessary files from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/.env ./

# Run Prisma migrations (optional, remove if not needed at container start)
CMD npx prisma migrate deploy && node dist/server.js

# Expose the port (change if your app uses a different port)
EXPOSE 3000
