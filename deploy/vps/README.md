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
