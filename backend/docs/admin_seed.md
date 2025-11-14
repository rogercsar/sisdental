# Admin Seed

Este documento explica como criar um usuário `admin` para gerenciar o sistema usando o endpoint de seed protegido por token.

## Pré-requisitos

- Backend rodando (porta padrão `8080`).
- Variável de ambiente `ADMIN_SEED_TOKEN` definida no `.env` do backend.
- Supabase configurado e acessível pelo backend.

## Configuração

1. Adicione no arquivo `.env` do backend:

```
ADMIN_SEED_TOKEN=troque-por-um-token-seguro
```

2. Reinicie o servidor backend para carregar o novo env.

## Endpoint

- Método: `POST`
- URL: `http://localhost:8080/api/admin/seed`
- Headers:
  - `Content-Type: application/json`
  - `X-Admin-Seed-Token: <seu-token>`
- Body JSON:
```
{
  "email": "admin@example.com",
  "password": "SenhaForte123!",
  "name": "Admin"
}
```

## Exemplo (PowerShell)

```
$body = @{ email = "admin@example.com"; password = "SenhaForte123!"; name = "Admin" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/admin/seed" -Headers @{ "X-Admin-Seed-Token" = "troque-por-um-token-seguro" } -ContentType "application/json" -Body $body
```

## Observações

- O usuário é criado no Supabase Auth com `role=admin` em `user_metadata`.
- Se a confirmação de e-mail estiver habilitada no Supabase, confirme o e-mail para ativar a conta.
- O middleware de autenticação extrai `role` do JWT e a disponibiliza no contexto da requisição, permitindo checagens de autorização para rotas de administração.