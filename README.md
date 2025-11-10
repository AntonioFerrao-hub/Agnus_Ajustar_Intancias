# Agnus Ajustar Instâncias

Aplicação full-stack (frontend em Vite + backend Express) para gerenciar conexões/instâncias. Este README foca em rodar via Docker localmente e publicar imagens via GitHub Actions.

## Rodando com Docker Compose
- Pré-requisitos: `Docker` e `Docker Compose` instalados.
- Configure o arquivo `.env` (baseado em `.env.example`). Campos mínimos:
  - `NODE_ENV=production`
  - `PORT=3000`
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`, `DB_PORT`
  - `JWT_SECRET` é opcional; se ausente, o backend usa `dev-secret-change-me`.
- Comandos:
  - `docker compose up -d` — constrói a imagem e sobe o serviço `web` em `localhost:3000`.
  - `docker compose logs -f web` — acompanha os logs (inclui teste de conexão ao MySQL).
  - `docker compose down` — para e remove os recursos.

### Saúde e verificação
- Healthcheck: o container tenta acessar `http://localhost:3000/` periodicamente.
- Backend expõe `GET /api/version` para conferir versão em runtime.
- Logs iniciais mostram resultado da conexão com o MySQL.

## Imagens Docker (CI/CD)
- O pipeline (`.github/workflows/docker.yml`) constrói e publica automaticamente em:
  - `docker.io/antonioferrao/agnus-ajustar-intancias:latest` e tags derivadas de branch/tag (ex.: `main`, `v1.2.3`).
- Requisitos de secrets no repositório (Settings → Secrets and variables → Actions):
  - `DOCKER_USERNAME` → seu usuário do Docker Hub (ex.: `antonioferrao`).
  - `DOCKER_PASSWORD` → token de acesso/personal access token do Docker Hub.
- Para usar imagem pronta sem build local, ajuste `docker-compose.yml` para:
  - `image: docker.io/antonioferrao/agnus-ajustar-intancias:latest`
  - Remover `build: .` se não quiser compilar localmente.

## Portainer / Stack
- `portainer-stack.yml` já aponta para Docker Hub com tag `latest` e labels Traefik.
- Defina `DOCKERHUB_USERNAME` no ambiente do Portainer (ou mantenha `antonioferrao-hub` como fallback).
- As variáveis de banco estão no serviço `conexao-app`; ajuste conforme seu ambiente.

## Desenvolvimento local sem Docker
- `pnpm install`
- `pnpm run dev` (frontend)
- `node backend/index.js` (backend, se quiser rodar separado)

## Notas
- Evite commitar segredos reais em arquivos versionados. Use variáveis de ambiente/secret store.
- JWT sem `JWT_SECRET` gera tokens com um segredo padrão apenas para desenvolvimento.
