FROM node:22 AS builder
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22 AS runner
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=builder /workspace/.next .next
COPY --from=builder /workspace/public public
COPY --from=builder /workspace/package.json package.json
RUN npm ci --only=production
EXPOSE 3003
CMD ["npx","next","start","-p","3003"]
