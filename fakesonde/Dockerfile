ARG NODE_VERSION="24"
ARG ALPINE_VERSION="3.23"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}

LABEL authors="IBRAHIMA FOFANA"

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN mkdir -p /app/temp

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --chown=nodejs:nodejs . .

RUN chown -R nodejs:nodejs /app/temp

USER nodejs

CMD ["node", "server.js"]
