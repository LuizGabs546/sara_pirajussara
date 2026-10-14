# Sara Pirajussara — Site + ADM

## Estrutura
- `backend/` — FastAPI + SQLAlchemy + autenticação
- `admin/` — painel administrativo separado
- `public/` — seu site público atualizado para consumir a API

## Permissões
- `admin`: pode criar/editar/excluir eventos; não acessa pedidos de oração.
- `prayer`: pode criar/editar/excluir eventos e acessar pedidos de oração.

## Segurança
- Senhas com Argon2.
- JWT em cookie HttpOnly.
- CSRF token nas operações protegidas.
- SQLAlchemy ORM/consultas parametrizadas, evitando SQL Injection.
- Validação de entrada com Pydantic.
- Checagem de função no backend, não apenas no front-end.
- Conteúdo dos pedidos/eventos escapado no navegador para reduzir risco de XSS.

## Rodar localmente
1. Entre em `backend`.
2. Crie `.env` copiando `.env.example` ou use o `.env` já preparado no projeto. Se alterar `ADMIN_PASSWORD`, reinicie o backend para sincronizar a senha com o banco.
3. Instale: `pip install -r requirements.txt`
4. Rode: `uvicorn main:app --reload --port 8000`
5. Sirva `admin/` em uma porta (ex.: Live Server 5501).
6. Sirva `public/` em outra porta (ex.: Live Server 5500).
7. Se o Live Server usar outras portas, ajuste `PUBLIC_ORIGIN` e `ADMIN_ORIGIN` no `.env`.
8. Antes de publicar, mude `secure=False` para `secure=True` nos cookies quando estiver usando HTTPS.

## Produção
Para produção, prefira PostgreSQL em vez de SQLite e coloque o backend atrás de HTTPS. Atualize `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_ORIGIN` e `ADMIN_ORIGIN`. No `public/index.html`, troque `window.SARA_API_BASE` pela URL HTTPS da API. No `admin/config.js`, troque `window.API_BASE_URL` pela mesma URL.
