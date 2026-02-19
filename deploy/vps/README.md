# Deploy da API em VPS (Ubuntu)

Este pacote sobe a API `.NET 9` e o `PostgreSQL` via Docker Compose, com `Nginx` fazendo proxy reverso.

## 1) Preparar servidor

```bash
chmod +x deploy/vps/scripts/install-ubuntu.sh
./deploy/vps/scripts/install-ubuntu.sh
```

Depois, faça logout/login no servidor para aplicar o grupo `docker`.

## 2) Configurar variaveis

```bash
cp deploy/vps/.env.production.example deploy/vps/.env.production
```

Edite `deploy/vps/.env.production` e preencha todos os segredos.

## 3) Subir API + banco

```bash
chmod +x deploy/vps/scripts/deploy.sh
./deploy/vps/scripts/deploy.sh
```

Teste local:

```bash
curl -fsS http://127.0.0.1:5071/health
```

## 4) Configurar Nginx (dominio)

1. Copie `deploy/vps/nginx/api.conf` para `/etc/nginx/sites-available/ecommerce-api.conf`.
2. Troque `api.seudominio.com` pelo seu dominio.
3. Ajuste a porta se mudou `API_HOST_PORT`.
4. Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/ecommerce-api.conf /etc/nginx/sites-enabled/ecommerce-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 5) TLS (Let's Encrypt)

```bash
sudo certbot --nginx -d api.seudominio.com
```

## 6) Backup do banco

```bash
chmod +x deploy/vps/scripts/backup-postgres.sh
./deploy/vps/scripts/backup-postgres.sh
```

Padrao de saida: `/var/backups/ecommerce`.

## 7) Atualizar deploy

```bash
git pull
./deploy/vps/scripts/deploy.sh
```

## 8) Deploy automatico (GitHub Actions)

Workflow: `.github/workflows/deploy-vps.yml`

Gatilhos:
- push em `main/master` (quando muda `src/**` ou `deploy/vps/**`)
- execucao manual com `rollback_ref` opcional

Secrets necessarios no repositorio:
- `VPS_HOST`: IP ou dominio da VPS
- `VPS_USER`: usuario SSH (ex: `deploy`)
- `VPS_SSH_PRIVATE_KEY`: chave privada para acesso SSH
- `VPS_SSH_PORT`: porta SSH (ex: `22`)
- `VPS_APP_DIR`: caminho do repo na VPS (ex: `/home/deploy/copilot-sdk-main`)
- `VPS_API_PORT`: porta local da API (padrao recomendado: `5071`)

No primeiro setup da VPS, garanta que:
- o repositorio ja foi clonado em `VPS_APP_DIR`
- `deploy/vps/.env.production` existe e esta preenchido
