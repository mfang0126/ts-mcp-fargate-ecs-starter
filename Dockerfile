FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY server.ts ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Health check - FastMCP has built-in health endpoint at /mcp
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/mcp', (r) => {process.exit(r.statusCode === 200 || r.statusCode === 405 ? 0 : 1)})"

# Start FastMCP server with npx
CMD ["npx", "tsx", "server.ts"]
