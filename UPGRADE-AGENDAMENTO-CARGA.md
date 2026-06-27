# Upgrade — Agendamento de Carga com QR Code e Notificações por Departamento

**Data:** 2026-06-27
**Status:** Planejamento
**Prioridade:** Alta

---

## Visão Geral

Adicionar ao SOS Entry um fluxo completo de **pré-agendamento de entrega**, iniciado internamente pelo setor de Compras ou Vendas, preenchido remotamente pela empresa fornecedora/terceira, com geração automática de QR Code para uso na portaria e notificações em tempo real para todos os departamentos envolvidos.

---

## Fluxo Completo

```
[Compras/Vendas] → Gera link de agendamento
        │
        ▼
[Empresa Terceira] → Abre link, preenche dados + anexa NF
        │
        ├── Notifica: Compras/Vendas, Logística, Portaria (previsão)
        │
        ▼
[NF Faturada / Confirmada internamente]
        │
        ├── Notifica: Logística, Portaria de Transporte → ENTRADA APROVADA
        │
        ▼
[Caminhoneiro chega na portaria] → Apresenta QR Code
        │
        ├── Portaria escaneia/valida QR
        └── Notifica TODOS os departamentos → "Carga aguardando na portaria"
```

---

## Funcionalidades Detalhadas

### 1. Geração do Link de Agendamento

- Setor de Compras ou Vendas acessa o painel e cria um **pedido de agendamento**
- Informa: número do pedido interno, tipo de carga, departamento responsável, data prevista desejada
- Sistema gera um **link único e temporário** (token UUID com expiração configurável, ex: 72h)
- Link é copiado ou enviado diretamente via WhatsApp para o contato da empresa terceira

**Exemplo de link:**
```
https://seudominio.com/agendamento/abc123uuid
```

---

### 2. Formulário Público (Empresa Terceira)

Página acessível **sem login**, validada pelo token UUID.

**Campos obrigatórios:**
| Campo | Tipo |
|-------|------|
| Razão Social da Empresa | Texto |
| CNPJ | Texto (máscara) |
| Nome do motorista | Texto |
| CPF do motorista | Texto (máscara) |
| Placa do veículo | Texto |
| Tipo de veículo | Select (Truck, Toco, VUC, Bitrem, etc.) |
| Número da NF | Texto |
| Valor da NF | Número |
| Upload da NF (PDF/XML/imagem) | Arquivo |
| Data prevista de entrega | Date picker |
| Horário preferencial | Time picker |
| Observações | Textarea |

**Ao submeter:**
- Dados são salvos no banco vinculados ao pedido
- QR Code é gerado automaticamente com os dados do agendamento
- Tela de confirmação exibe o QR Code para download/impressão
- E-mail ou WhatsApp com QR Code é enviado ao motorista (opcional)

---

### 3. QR Code

**Conteúdo codificado no QR:**
```json
{
  "agendamentoId": "uuid",
  "token": "token-de-validacao",
  "placa": "ABC-1234",
  "motorista": "João Silva",
  "empresa": "Transportes XYZ",
  "nf": "000123",
  "dataEntrega": "2026-07-10",
  "horario": "09:00"
}
```

- QR Code gerado server-side (biblioteca `qrcode` npm)
- Disponível para download em PNG e exibição na tela
- Pode ser apresentado no celular do motorista ou impresso

---

### 4. Notificações por Etapa

#### Etapa A — Formulário preenchido pela terceira
**Notificados:** Compras/Vendas + Departamento responsável pelo pedido
**Canal:** SSE (painel) + WhatsApp
**Mensagem:**
> "📦 Nova NF recebida — [Empresa] | NF [número] | Previsão: [data] [hora]"

#### Etapa B — NF Faturada / Confirmada internamente
**Ação:** Usuário interno (Compras/Vendas ou Logística) confirma/aprova o agendamento no painel
**Notificados:** Logística + Portaria de Transporte
**Canal:** SSE + WhatsApp
**Mensagem:**
> "✅ Entrega APROVADA na portaria — [Empresa] | NF [número] | Data: [data]"

#### Etapa C — Motorista chega e QR é validado na portaria
**Ação:** Portareiro escaneia o QR Code ou digita o ID do agendamento
**Notificados:** TODOS os departamentos vinculados ao pedido (Compras, Logística, Comercial, Portaria)
**Canal:** SSE + WhatsApp
**Mensagem:**
> "🚛 Caminhão NA PORTARIA aguardando liberação — [Empresa] | Motorista: [nome] | Placa: [placa] | Doca: pendente"

---

### 5. Painel de Agendamentos (Interno)

Nova página no painel administrativo: `/admin/agendamentos`

**Roles com acesso:** supervisor+

**Colunas da lista:**
| Campo | Descrição |
|-------|-----------|
| Status | Badge: Aguardando NF / NF Recebida / Aprovado / Na Portaria / Concluído |
| Empresa | Razão social do fornecedor |
| NF | Número da nota fiscal |
| Placa | Placa do veículo |
| Previsão | Data + horário previstos |
| Departamento | Setor interno responsável |
| Criado por | Usuário que gerou o link |
| Ações | Ver detalhes / Aprovar / Cancelar |

**Filtros:** status, data, departamento, busca livre

---

### 6. Validação do QR na Portaria

Na tela da portaria (operador), novo botão **"Validar QR / Agendamento"**:

- Campo para digitar o ID do agendamento manualmente (caso câmera indisponível)
- Integração com câmera do dispositivo via `jsQR` ou `html5-qrcode` para leitura direta no browser
- Ao validar: exibe resumo do agendamento (motorista, placa, empresa, NF, status)
- Botão **"Registrar Entrada"** preenche o formulário de entrada automaticamente com os dados do QR
- Notificação broadcast disparada para todos os setores

---

## Novos Modelos de Banco (Prisma)

```prisma
model Agendamento {
  id              String   @id @default(uuid())
  token           String   @unique @default(uuid())
  tokenExpiraEm   DateTime
  status          AgendamentoStatus @default(AGUARDANDO_NF)

  // Criado por
  criadoPorId     String
  criadoPor       User     @relation(fields: [criadoPorId], references: [id])
  departamento    String   // "compras", "vendas", "logistica"
  pedidoInterno   String?  // número do pedido interno

  // Dados preenchidos pela terceira
  empresa         String?
  cnpj            String?
  motorista       String?
  cpfMotorista    String?
  placa           String?
  tipoVeiculo     String?
  numeroNF        String?
  valorNF         Decimal?
  nfArquivoUrl    String?  // URL do arquivo uploadado
  dataEntrega     DateTime?
  horarioPref     String?
  observacoes     String?

  // Controle
  aprovadoPorId   String?
  aprovadoPor     User?    @relation("AgendamentoAprovador", fields: [aprovadoPorId], references: [id])
  aprovadoEm      DateTime?
  chegadaEm       DateTime?
  registroId      String?  // vincula ao Registro de entrada

  portariaId      String
  portaria        Portaria @relation(fields: [portariaId], references: [id])

  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
}

enum AgendamentoStatus {
  AGUARDANDO_NF
  NF_RECEBIDA
  APROVADO
  NA_PORTARIA
  CONCLUIDO
  CANCELADO
}
```

---

## Novos Endpoints API

### Agendamentos (interno)
```
GET    /api/agendamentos                  Listar (supervisor+)
POST   /api/agendamentos                  Criar link (operador+)
GET    /api/agendamentos/:id              Detalhes (operador+)
PATCH  /api/agendamentos/:id/aprovar      Aprovar NF (supervisor+)
PATCH  /api/agendamentos/:id/cancelar     Cancelar (supervisor+)
POST   /api/agendamentos/:id/validar-qr   Validar chegada na portaria (operador+)
GET    /api/agendamentos/:id/qrcode       Gerar/retornar QR Code PNG (operador+)
```

### Formulário público (sem autenticação)
```
GET    /api/publico/agendamento/:token    Buscar dados do link (valida token/expiração)
POST   /api/publico/agendamento/:token    Submeter dados + NF (multipart/form-data)
```

---

## Novos Eventos SSE

| Evento | Payload | Quando |
|--------|---------|--------|
| `agendamento_nf_recebida` | empresa, nf, data, horario | Terceira submete formulário |
| `agendamento_aprovado` | empresa, placa, data | Aprovação interna |
| `agendamento_chegada` | empresa, motorista, placa, portaria | QR validado na portaria |

---

## Novos Eventos Webhook

| Evento | Quando |
|--------|--------|
| `agendamento.nf_recebida` | Formulário submetido pela terceira |
| `agendamento.aprovado` | Aprovação interna da NF |
| `agendamento.chegada_portaria` | Validação do QR na chegada |
| `agendamento.entrada_registrada` | Entrada efetivada no sistema |

---

## Dependências Novas (npm)

### Backend
```json
"qrcode": "^1.5.4",          // geração do QR Code (PNG/SVG/base64)
"multer": "^1.4.5",           // upload de arquivos (NF PDF/XML/imagem)
"uuid": "já instalado"
```

### Frontend
```json
"html5-qrcode": "^2.3.8"     // leitura de QR Code via câmera no browser
```

---

## Armazenamento de Arquivos (NF Upload)

**Opção recomendada (curto prazo):** Supabase Storage
- Bucket: `notas-fiscais`
- Caminho: `agendamentos/{agendamentoId}/{timestamp}-nf.pdf`
- URL pública ou signed URL com expiração

**Alternativa:** Pasta local no container + volume Docker (mais simples, sem dependência extra)

---

## Novas Páginas Frontend

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/admin/agendamentos` | `Agendamentos.jsx` | supervisor+ |
| `/admin/agendamentos/novo` | `NovoAgendamento.jsx` | operador+ |
| `/admin/agendamentos/:id` | `AgendamentoDetalhe.jsx` | operador+ |
| `/agendamento/:token` | `FormularioPublico.jsx` | **público** (sem login) |
| `/agendamento/:token/confirmacao` | `AgendamentoConfirmado.jsx` | **público** |

---

## Estrutura de Arquivos Novos

```
backend/src/
├── controllers/
│   ├── agendamento.controller.js
│   └── agendamentoPublico.controller.js
├── routes/
│   ├── agendamento.routes.js
│   └── agendamentoPublico.routes.js
├── services/
│   └── qrcode.service.js
└── uploads/                          (se usar armazenamento local)

frontend/src/
├── pages/
│   ├── admin/
│   │   ├── Agendamentos.jsx
│   │   ├── NovoAgendamento.jsx
│   │   └── AgendamentoDetalhe.jsx
│   └── publico/
│       ├── FormularioPublico.jsx
│       └── AgendamentoConfirmado.jsx
```

---

## Etapas de Implementação

### Fase 1 — Base (backend)
- [ ] Migration: tabela `Agendamento` + enum `AgendamentoStatus`
- [ ] Controller + rotas internas de agendamento
- [ ] Controller + rotas públicas (sem auth) com validação de token
- [ ] Upload de NF com multer (ou Supabase Storage)
- [ ] Geração de QR Code via `qrcode` npm
- [ ] Notificações SSE para os 3 eventos principais
- [ ] Disparar webhooks nos eventos de agendamento

### Fase 2 — Frontend público
- [ ] Página `FormularioPublico.jsx` (acessível via link externo)
- [ ] Validação de token expirado (mensagem amigável)
- [ ] Exibição e download do QR Code na confirmação
- [ ] Envio do QR via WhatsApp ao motorista (opcional)

### Fase 3 — Painel interno
- [ ] Página `Agendamentos.jsx` com lista + filtros + badges de status
- [ ] Página `NovoAgendamento.jsx` para gerar o link + copiar/enviar WhatsApp
- [ ] Página `AgendamentoDetalhe.jsx` com timeline + botão aprovar + visualizar NF
- [ ] Integração de validação do QR na tela da portaria (câmera + manual)
- [ ] Preenchimento automático do formulário de entrada a partir do QR

### Fase 4 — Refinamentos
- [ ] Expiração e reenvio de link
- [ ] Histórico de agendamentos por departamento
- [ ] Relatório de pontualidade de entregas (previsão x realizado)
- [ ] Configuração de horários de funcionamento da doca por portaria

---

## Considerações de Segurança

- Token de link público: UUID v4 com expiração — não expõe dados internos
- Upload de NF: validar tipo MIME + tamanho máximo (ex: 10MB)
- Formulário público: rate limiting por IP para evitar submissões repetidas
- QR Code: contém apenas ID + token de validação — dados sensíveis só retornados após validação autenticada
- Logs de auditoria: todas as ações registradas em `audit_logs`

---

## Impacto em Funcionalidades Existentes

| Área | Impacto |
|------|---------|
| `registro.controller.js` | Recebe `agendamentoId` opcional; ao registrar entrada, marca agendamento como `CONCLUIDO` |
| `sse.service.js` | Adicionar broadcast para os 3 novos eventos |
| `webhook.service.js` | Adicionar os 4 novos tipos de evento |
| `Sidebar.jsx` | Adicionar item "Agendamentos" para supervisor+ |
| `App.jsx` / router | Adicionar rotas públicas fora do `ProtectedRoute` |
| Nginx | Rota `/agendamento/*` deve servir o React SPA normalmente |

---

## Resultado Esperado

Com esta funcionalidade implementada, o fluxo de recebimento de cargas passa de **reativo** (porteiro registra quem chegou) para **proativo** (empresa já sabe o que vai chegar, quando, e todos os setores estão preparados antes do caminhão chegar na portaria).
