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

# --------------------
# Production Image
# --------------------
FROM node:18-alpine AS production
WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built app and required files
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# No .env copied — ENV MUST come at runtime only

# Start: run migrations then server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

# Expose port (if app uses 3000)
EXPOSE 3000
