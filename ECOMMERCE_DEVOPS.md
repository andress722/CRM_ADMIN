# DEVOPS & INFRAESTRUTURA - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Docker, Kubernetes, CI/CD, Monitoring, Database, CDN, Deployment

---

## 1. DOCKER & CONTAINERIZAÇÃO

### 1.1 Dockerfile - Backend (ASP.NET Core 8)

```dockerfile
# Dockerfile.backend
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder

WORKDIR /src
COPY ["dotnet/src/GitHub.Copilot.SDK.csproj", "dotnet/src/"]
RUN dotnet restore "dotnet/src/GitHub.Copilot.SDK.csproj"

COPY . .
RUN dotnet build "dotnet/src/GitHub.Copilot.SDK.csproj" -c Release -o /app/build

FROM mcr.microsoft.com/dotnet/runtime:8.0-alpine AS base
WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080/tcp
ENV ASPNETCORE_HTTP_PORTS=8080

FROM builder AS publish
RUN dotnet publish "dotnet/src/GitHub.Copilot.SDK.csproj" -c Release -o /app/publish

FROM base AS final
COPY --from=publish /app/publish .

# Usuário non-root
RUN addgroup -g 1000 dotnetuser && \
    adduser -u 1000 -G dotnetuser -s /sbin/nologin -D dotnetuser
USER dotnetuser

ENTRYPOINT ["dotnet", "GitHub.Copilot.SDK.dll"]
```

**Build:**
```bash
docker build -f Dockerfile.backend -t ecommerce-api:latest .
docker run -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="postgres://..." \
  -e Stripe__SecretKey="sk_live_..." \
  ecommerce-api:latest
```

### 1.2 Dockerfile - Frontend (Next.js)

```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS deps
WORKDIR /app
COPY nodejs/package.json nodejs/package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY nodejs/package.json nodejs/package-lock.json ./
RUN npm ci

COPY nodejs .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 nodejs && \
    adduser -u 1001 -G nodejs -s /sbin/nologin -D nextjs
USER nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
```

**Build:**
```bash
docker build -f Dockerfile.frontend -t ecommerce-web:latest .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="https://api.example.com" \
  ecommerce-web:latest
```

### 1.3 Docker Compose (Desenvolvimento Local)

```yaml
# docker-compose.yml
version: '3.8'

services:
  
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: ecommerce-db
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: dbuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dbuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: ecommerce-cache
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: ecommerce-api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      ConnectionStrings__DefaultConnection: "Host=postgres;Port=5432;Database=ecommerce;Username=dbuser;Password=${DB_PASSWORD}"
      Redis__ConnectionString: "redis:6379"
      Stripe__SecretKey: ${STRIPE_SECRET_KEY}
      MercadoPago__AccessToken: ${MP_ACCESS_TOKEN}
      Jwt__SecretKey: ${JWT_SECRET}
      AllowedOrigins: "http://localhost:3000"
      ASPNETCORE_ENVIRONMENT: Development
      ASPNETCORE_HTTP_PORTS: 8080
    ports:
      - "8080:8080"
    volumes:
      - ./dotnet:/app/dotnet
    command: dotnet watch run --project dotnet/src/GitHub.Copilot.SDK.csproj

  # Frontend Web
  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: ecommerce-web
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:8080"
      NEXT_PUBLIC_STRIPE_KEY: ${NEXT_PUBLIC_STRIPE_KEY}
      NEXT_PUBLIC_MP_KEY: ${NEXT_PUBLIC_MP_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./nodejs:/app/nodejs
    command: npm run dev

volumes:
  postgres_data:

networks:
  default:
    name: ecommerce-network
```

**Start:**
```bash
cp .env.example .env
docker-compose up -d

# Database migrations
docker-compose exec api dotnet ef database update

# Access
# Frontend: http://localhost:3000
# API: http://localhost:8080
# Database: localhost:5432
```

---

## 2. KUBERNETES DEPLOYMENT

### 2.1 Namespace & Secrets

```yaml
# k8s/01-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce
  labels:
    name: ecommerce

---
# k8s/02-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: ecommerce
type: Opaque
stringData:
  POSTGRES_PASSWORD: ${DB_PASSWORD}
  CONNECTION_STRING: "Host=postgres;Port=5432;Database=ecommerce;Username=dbuser;Password=${DB_PASSWORD}"

---
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: ecommerce
type: Opaque
stringData:
  Stripe__SecretKey: ${STRIPE_SECRET_KEY}
  MercadoPago__AccessToken: ${MP_ACCESS_TOKEN}
  Jwt__SecretKey: ${JWT_SECRET}
```

### 2.2 PostgreSQL StatefulSet

```yaml
# k8s/03-postgres.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: ecommerce
data:
  postgresql.conf: |
    max_connections = 200
    shared_buffers = 256MB
    effective_cache_size = 1GB
    log_min_duration_statement = 1000

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: ecommerce
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard-rwo

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: ecommerce
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres
        envFrom:
        - secretRef:
            name: db-credentials
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: postgres-config
          mountPath: /etc/postgresql
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U dbuser
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U dbuser
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: postgres-config
        configMap:
          name: postgres-config
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: ecommerce
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### 2.3 Redis Deployment

```yaml
# k8s/04-redis.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: ecommerce
data:
  redis.conf: |
    maxmemory 512mb
    maxmemory-policy allkeys-lru
    save 900 1
    save 300 10
    save 60 10000

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: ecommerce
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
          - redis-server
          - /usr/local/etc/redis/redis.conf
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-config
          mountPath: /usr/local/etc/redis
        - name: redis-data
          mountPath: /data
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: redis-config
        configMap:
          name: redis-config
      - name: redis-data
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: ecommerce
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

### 2.4 Backend API Deployment

```yaml
# k8s/05-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: ecommerce
  labels:
    app: api
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        version: v1
    spec:
      serviceAccountName: api
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api
              topologyKey: kubernetes.io/hostname
      
      containers:
      - name: api
        image: ecommerce-api:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
          name: http
        
        envFrom:
        - secretRef:
            name: api-secrets
        - configMapRef:
            name: api-config
        
        env:
        - name: ConnectionStrings__DefaultConnection
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: CONNECTION_STRING
        - name: Redis__ConnectionString
          value: "redis:6379"
        - name: AllowedOrigins
          value: "https://example.com,https://www.example.com"
        
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 2
          failureThreshold: 2
        
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
        
        volumeMounts:
        - name: tmp
          mountPath: /tmp

      volumes:
      - name: tmp
        emptyDir: {}

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: ecommerce
data:
  ASPNETCORE_ENVIRONMENT: "Production"
  ASPNETCORE_HTTP_PORTS: "8080"
  Logging__LogLevel__Default: "Information"
  Logging__LogLevel__Microsoft: "Warning"

---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: ecommerce
  labels:
    app: api
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api
  namespace: ecommerce
```

### 2.5 Frontend Deployment

```yaml
# k8s/06-web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: ecommerce
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: ecommerce-web:latest
        ports:
        - containerPort: 3000
        
        env:
        - name: NEXT_PUBLIC_API_URL
          value: "https://api.example.com"
        - name: NEXT_PUBLIC_STRIPE_KEY
          valueFrom:
            secretKeyRef:
              name: stripe-keys
              key: public-key
        
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"

---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: ecommerce
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 3000

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
```

### 2.6 Ingress & LoadBalancer

```yaml
# k8s/07-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ecommerce-ingress
  namespace: ecommerce
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    - api.example.com
    secretName: ecommerce-tls
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 80
```

---

## 3. CI/CD (GitHub Actions)

### 3.1 Build & Test Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: ecommerce_test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '8.0.x'
    
    - name: Restore dependencies
      run: dotnet restore dotnet/
    
    - name: Build
      run: dotnet build dotnet/ -c Release --no-restore
    
    - name: Run unit tests
      run: dotnet test dotnet/ -c Release --no-build --logger "trx" --collect:"XPlat Code Coverage"
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: '**/coverage.cobertura.xml'
    
    - name: Run integration tests
      env:
        ConnectionStrings__DefaultConnection: "Host=localhost;Database=ecommerce_test;Username=postgres;Password=postgres"
      run: dotnet test dotnet/test/ -c Release --filter "Category=Integration"

  frontend-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: nodejs/package-lock.json
    
    - name: Install dependencies
      run: cd nodejs && npm ci
    
    - name: Lint
      run: cd nodejs && npm run lint
    
    - name: Type check
      run: cd nodejs && npm run type-check
    
    - name: Run tests
      run: cd nodejs && npm test
    
    - name: Build
      run: cd nodejs && npm run build
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Trivy scan
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
    
    - name: Secret scan
      uses: gitguardian/ggshield-action@master
      env:
        GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
```

### 3.2 Build & Push Docker Images

```yaml
# .github/workflows/docker-build.yml
name: Build Docker Images

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-backend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/{{ IMAGE_NAME }}-api
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=sha
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile.backend
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  build-frontend:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Log in to registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/{{ IMAGE_NAME }}-web
        tags: |
          type=ref,event=branch
          type=semver,pattern={{version}}
          type=sha
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        file: ./Dockerfile.frontend
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
```

### 3.3 Deploy to Kubernetes

```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
        chmod 600 $HOME/.kube/config
    
    - name: Update image
      run: |
        kubectl set image deployment/api \
          api=ghcr.io/${{ github.repository }}-api:sha-${{ github.sha }} \
          -n ecommerce
        
        kubectl set image deployment/web \
          web=ghcr.io/${{ github.repository }}-web:sha-${{ github.sha }} \
          -n ecommerce
    
    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/api -n ecommerce
        kubectl rollout status deployment/web -n ecommerce
    
    - name: Run smoke tests
      run: |
        sleep 10
        curl -f https://api.example.com/health || exit 1
        curl -f https://example.com/ || exit 1
    
    - name: Notify Slack
      if: failure()
      uses: slackapi/slack-github-action@v1.24.0
      with:
        payload: |
          {
            "text": "Deploy failed for ${{ github.repository }}",
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Deployment Failed*\nRepository: ${{ github.repository }}\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}"
                }
              }
            ]
          }
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        SLACK_WEBHOOK_TYPE: INCOMING_WEBHOOK
```

---

## 4. DATABASE BACKUP & RECOVERY

### 4.1 PostgreSQL Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="ecommerce"
DB_USER="dbuser"
DB_HOST="postgres.ecommerce.svc.cluster.local"

# Full backup (diário)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/full_$TIMESTAMP.sql.gz

# WAL backup (contínuo)
wal-g push wal

# Enviar para S3
aws s3 cp $BACKUP_DIR/full_$TIMESTAMP.sql.gz s3://backups-ecommerce/

# Cleanup: manter apenas últimos 30 dias
find $BACKUP_DIR -name "full_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/full_$TIMESTAMP.sql.gz"
```

**Kubernetes CronJob:**
```yaml
# k8s/08-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: ecommerce
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - /bin/sh
            - -c
            - |
              export PGPASSWORD=$DB_PASSWORD
              pg_dump -h postgres -U dbuser ecommerce | gzip > /backup/ecommerce_$(date +%Y%m%d_%H%M%S).sql.gz
              aws s3 cp /backup/ s3://backups-ecommerce/ --recursive
            env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: POSTGRES_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            emptyDir: {}
          restartPolicy: OnFailure
```

### 4.2 Disaster Recovery

```bash
#!/bin/bash
# scripts/restore.sh

# RTO: 4 horas
# RPO: 1 hora

BACKUP_FILE=$1
DB_NAME="ecommerce"
DB_USER="dbuser"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <backup_file>"
  exit 1
fi

echo "Restoring from $BACKUP_FILE..."

# 1. Dropar database (cuidado!)
dropdb -h localhost -U $DB_USER $DB_NAME

# 2. Recriar database
createdb -h localhost -U $DB_USER $DB_NAME

# 3. Restaurar backup
gunzip -c $BACKUP_FILE | psql -h localhost -U $DB_USER -d $DB_NAME

echo "Restore completed"
```

---

## 5. MONITORING & OBSERVABILITY

### 5.1 Prometheus Setup

```yaml
# k8s/09-prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: ecommerce
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    alerting:
      alertmanagers:
      - static_configs:
        - targets:
          - alertmanager:9093
    
    scrape_configs:
    - job_name: 'api'
      static_configs:
      - targets: ['api:8080']
      metrics_path: '/metrics'
    
    - job_name: 'postgres'
      static_configs:
      - targets: ['postgres-exporter:9187']
    
    - job_name: 'kubernetes-apiservers'
      kubernetes_sd_configs:
      - role: endpoints
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: ecommerce
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.48.0
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--storage.tsdb.retention.time=30d'
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-storage
          mountPath: /prometheus
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-storage
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: ecommerce
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
  type: ClusterIP
```

### 5.2 Grafana Dashboards

```yaml
# k8s/10-grafana.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: ecommerce
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: ecommerce
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-admin
              key: password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel"
        volumeMounts:
        - name: grafana-datasources
          mountPath: /etc/grafana/provisioning/datasources
        - name: grafana-storage
          mountPath: /var/lib/grafana
      volumes:
      - name: grafana-datasources
        configMap:
          name: grafana-datasources
      - name: grafana-storage
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: ecommerce
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

**Dashboards:**
- API Response Times
- Database Query Performance
- Cache Hit Rate
- Error Rate by Endpoint
- Pod Resource Usage
- Network I/O

### 5.3 Application Insights (.NET)

```csharp
// Program.cs
builder.Services.AddApplicationInsightsTelemetry(
  options =>
  {
    options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
  }
);

builder.Services.AddSingleton<ITelemetryInitializer>(
  new SetApplicationName { AppName = "Ecommerce.API" }
);

// Custom tracking
public class OrderService
{
  private readonly TelemetryClient _telemetry;
  
  public async Task<Order> CreateOrderAsync(CreateOrderRequest request)
  {
    using (_telemetry.StartOperation<RequestTelemetry>("CreateOrder"))
    {
      var order = new Order { /* ... */ };
      
      // Track custom event
      _telemetry.TrackEvent("OrderCreated", new Dictionary<string, string>
      {
        { "OrderId", order.Id.ToString() },
        { "Amount", order.TotalAmount.ToString() },
        { "PaymentMethod", order.PaymentMethod }
      });
      
      return order;
    }
  }
}
```

---

## 6. CDN & PERFORMANCE

### 6.1 CloudFront (Images)

```yaml
# terraform/cloudfront.tf
resource "aws_cloudfront_distribution" "s3" {
  origin {
    domain_name = aws_s3_bucket.images.bucket_regional_domain_name
    origin_id   = "s3-images"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled = true
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-images"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000  # 1 year
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

### 6.2 Image Optimization (Next.js)

```typescript
// nodejs/src/app/components/ProductImage.tsx
import Image from 'next/image';

export function ProductImage({ src, alt }: ImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={500}
      height={500}
      priority={true}
      placeholder="blur"
      blurDataURL={getBlurHash(src)}
      quality={85}
      loader={({ src, width }) =>
        `https://cdn.example.com/${src}?w=${width}&q=85`
      }
    />
  );
}
```

---

## 7. SCALING STRATEGIES

### 7.1 Horizontal Scaling

```yaml
# HPA configures automatic scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: ecommerce
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
```

### 7.2 Caching Strategy

```csharp
// API caching (Redis)
[HttpGet("products")]
[ResponseCache(CacheProfileName = "Default")]
public async Task<IActionResult> GetProducts([FromQuery] int page = 1)
{
  var cacheKey = $"products:page:{page}";
  
  if (await _cache.TryGetAsync(cacheKey, out var cached))
    return Ok(JsonSerializer.Deserialize<List<ProductDto>>(cached));
  
  var products = await _service.GetProductsAsync(page);
  await _cache.SetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(products), 
    new DistributedCacheEntryOptions
    {
      AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
    }
  );
  
  return Ok(products);
}
```

---

## 8. DEVOPS CHECKLIST

```markdown
## Infrastructure & Deployment

### Docker & Containerization
- [ ] Backend Dockerfile (multi-stage build)
- [ ] Frontend Dockerfile (optimized)
- [ ] Docker Compose (dev environment)
- [ ] Image registry (GitHub Container Registry)
- [ ] Image security scanning

### Kubernetes
- [ ] Namespace setup
- [ ] Secrets management
- [ ] PostgreSQL StatefulSet
- [ ] Redis Deployment
- [ ] API Deployment with HPA
- [ ] Web Deployment with HPA
- [ ] Ingress controller setup
- [ ] SSL/TLS certificates (cert-manager)

### Database
- [ ] PostgreSQL backup strategy (daily)
- [ ] WAL archiving
- [ ] Point-in-time recovery tested
- [ ] RTO: 4 horas / RPO: 1 hora

### CI/CD
- [ ] Unit tests automated
- [ ] Integration tests automated
- [ ] Security scanning (Trivy, GitGuardian)
- [ ] Docker build & push
- [ ] Kubernetes deployment
- [ ] Smoke tests
- [ ] Rollback strategy

### Monitoring
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Application Insights
- [ ] Alerts configured
- [ ] Log aggregation (ELK or similar)

### Performance
- [ ] CDN for static assets
- [ ] Image optimization
- [ ] Cache headers set
- [ ] Rate limiting configured
- [ ] Load testing done

### Security
- [ ] Network policies
- [ ] Pod security policies
- [ ] RBAC configured
- [ ] Secrets encrypted
- [ ] Regular security updates
```

---

**DevOps & Infraestrutura Completa ✅**

