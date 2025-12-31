# DOCUMENTAÇÃO TÉCNICA - PWA COLETAS DE EQUIPAMENTOS

## STACK TECNOLÓGICA

- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Vanilla)
- **Armazenamento**: LocalStorage (browser-native)
- **PWA**: Service Worker (Cache-First Strategy)
- **Padrão**: SPA (Single Page Application)
- **Arquitetura**: OOP (Class-Based)

---

## ESTRUTURA DO PROJETO

```
/
├── index.html          # SPA principal (89KB)
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
└── icons/             # Ícones PWA (não presente no código)
```

---

## ARQUITETURA DA APLICAÇÃO

### CLASSE PRINCIPAL: `SistemaColetas`

**Responsabilidade**: Gerenciar todo o ciclo de vida de coletas de equipamentos.

#### PROPRIEDADES

```javascript
colecoes: {}              // { nomeColeta: [itens] }
colecaoAtual: null        // String: nome da coleta ativa
dadosAtuais: []          // Array: itens da coleta atual
indiceEdicao: -1         // Int: controle de edição (-1 = novo)
promptInstalacao: null   // PWA install prompt

baseDados: {             // Marcas/modelos predefinidos
  MONITOR: { marca: [modelos] },
  GABINETE: { marca: [modelos] },
  NOTEBOOK: { marca: [modelos] },
  RAMAL: {}
}

dadosPersonalizados: {}  // Marcas/modelos adicionados pelo usuário
historico: {             // Frequência de uso
  setores: { nome: count },
  locais: { nome: count }
}
```

---

## FUNCIONALIDADES CORE

### 1. GERENCIAMENTO DE COLETAS

**Operações**:
- `criarColecao()`: Modal input → salva em `this.colecoes`
- `abrirColecao(nome)`: Carrega coleta no estado atual
- `excluirColecao(nome)`: Remove do localStorage
- `renderizarListaColecoes()`: UI da lista de coletas

**Armazenamento**: `localStorage.allEquipmentCollections`

---

### 2. CAMPOS DINÂMICOS INTELIGENTES

#### 2.1 TIPO → MARCA → MODELO

**Fluxo**:
1. Usuário seleciona TIPO
2. Sistema popula SELECT de MARCA com:
   - `baseDados[tipo]` (marcas predefinidas)
   - `dadosPersonalizados[tipo]` (marcas do usuário)
   - Opção "➕ Outro..."
3. Se "Outro..." → input manual aparece
4. Marca selecionada → popula MODELO
5. Modelo não existe → opção "➕ Outro..."

**Persistência**: `localStorage.equipmentCustomData`

#### 2.2 SETOR E LOCAL (Com Frequência)

**Lógica**:
- `historico.setores` e `historico.locais` contam quantas vezes cada valor foi usado
- `obterSetoresOrdenados()`: Retorna lista ordenada por frequência
- Top 5 mais usados aparecem primeiro no SELECT
- Badge visual mostra frequência (ex: "ALMOXARIFADO 23x")
- Sempre tem opção "➕ Outro..." para novos valores

**Persistência**: `localStorage.locationHistory`

**Atualização**: `adicionarHistorico(tipo, valor)` incrementa contador ao salvar item

---

### 3. CRUD DE ITENS

#### ESTRUTURA DO ITEM

```javascript
{
  type: String,           // GABINETE|NOTEBOOK|MONITOR|RAMAL
  brand: String,          // Marca
  model: String,          // Modelo
  serialNumber: String,   // Número de série
  patSiads: String,       // Patrimônio SIADS
  patEbserh: String,      // Patrimônio EBSERH
  patFub: String,         // Patrimônio FUB
  building: String,       // Prédio
  floor: String,          // Andar
  setor: String,          // Setor (novo campo)
  local: String,          // Local (novo campo)
  sector: String,         // "SETOR - LOCAL" (legado, mantido para compatibilidade)
  vinculo: String,        // Patrimônio do computador vinculado (para MONITOR/RAMAL)
  observation: String     // Observações
}
```

#### OPERAÇÕES

- `salvarItem(event)`: Validação → adiciona/atualiza → incrementa histórico
- `editarItem(indice)`: Preenche form → modo edição
- `excluirItem(indice)`: Modal confirmação → remove
- `limparTodos()`: Modal confirmação → esvazia array

**Validações**:
1. Campos obrigatórios: tipo, marca, prédio, andar, setor, local
2. Pelo menos 1 patrimônio (serialNumber, patSiads, patEbserh ou patFub)

---

### 4. EXPORTAÇÃO CSV

**Formato**:
- Delimitador: `;` (padrão brasileiro)
- BOM: `\uFEFF` (UTF-8 com BOM para Excel)
- Escape: Valores com `;`, `"` ou `\n` são wrapeados em `""`

**Colunas**:
```
TIPO;MARCA;MODELO;NÚMERO DE SÉRIE;PAT. SIADS;PAT. EBSERH;PAT. FUB;PRÉDIO;ANDAR;SETOR;LOCAL;VÍNCULO;OBSERVAÇÃO
```

**Operações**:
- `exportarColecao()`: Gera CSV → exibe em textarea
- `exportarDiretoCSV(nome)`: Gera CSV → download automático
- `copiarCSV()`: Clipboard API
- `baixarCSV()`: Blob download

---

### 5. PWA (PROGRESSIVE WEB APP)

#### SERVICE WORKER (`sw.js`)

**Estratégia**: Cache-First

```javascript
CACHE_NAME: 'coletas-pwa-v3.0'

RECURSOS_CACHE: [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/...'
]
```

**Eventos**:
- `install`: Cacheia recursos → `skipWaiting()`
- `activate`: Remove caches antigos → `clients.claim()`
- `fetch`: 
  - Same-origin: Cache → Network → Cache fallback
  - Cross-origin: Cache → Network → Empty response

#### MANIFEST (`manifest.json`)

- **Display**: `standalone` (fullscreen app)
- **Theme**: `#4f46e5` (indigo)
- **Icons**: 72x72 até 512x512
- **Shortcuts**: Nova Coleta, Minhas Coletas

#### INSTALL PROMPT

```javascript
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  this.promptInstalacao = e;
  // Mostra banner de instalação
});
```

---

## MIGRAÇÃO DE DADOS

### CAMPOS LEGADOS → NOVOS

```javascript
// Migração automática ao carregar
if (item.sector && !item.setor && !item.local) {
  const partes = item.sector.split(/[-/,]/);
  item.setor = partes[0].trim();
  item.local = partes[1]?.trim() || partes[0].trim();
}

// Tipo antigo → novo
if (item.type === 'MINIPC') {
  item.type = 'GABINETE';
}
```

---

## NAVEGAÇÃO (SPA)

### TELAS

1. **telaPrincipal**: Menu inicial
2. **telaListaColetas**: Lista de todas as coletas
3. **telaDadosColeta**: CRUD da coleta atual
   - **Aba Formulário**: Adicionar/editar item
   - **Aba Tabela**: Visualizar/gerenciar itens

### FLUXO

```
Principal → [Nova Coleta] → Input nome → DadosColeta
Principal → [Acessar Existente] → ListaColetas → DadosColeta
DadosColeta → [INÍCIO] → Principal
DadosColeta → [TODAS COLETAS] → ListaColetas
```

---

## SEGURANÇA E VALIDAÇÃO

### XSS PREVENTION

```javascript
escaparHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;  // Escapa automaticamente
  return div.innerHTML;
}
```

**Uso**: Todos os dados do usuário são escapados antes de innerHTML.

### CSV INJECTION PREVENTION

```javascript
escaparCSV(valor) {
  if (valor.includes(';') || valor.includes('"') || valor.includes('\n')) {
    return `"${valor.replace(/"/g, '""')}"`;  // RFC 4180
  }
  return valor;
}
```

---

## LIMITAÇÕES CONHECIDAS

1. **Armazenamento**: LocalStorage (~5-10MB dependendo do browser)
2. **Sincronização**: Sem sync entre dispositivos (dados locais apenas)
3. **Backup**: Sem backup automático (usuário deve exportar CSV)
4. **Concorrência**: Última escrita vence (sem conflict resolution)
5. **Icons**: Referências a `/icons/` mas arquivos não estão no código fonte

---

## DEPENDÊNCIAS EXTERNAS

- **Google Fonts**: Inter (weights: 400, 500, 600, 700)
- Nenhuma biblioteca JS (Vanilla puro)

---

## RESPONSIVIDADE

**Breakpoint**: `768px`

**Mobile**:
- Grid de formulário: 1 coluna
- Ações dos itens: Grid 2 colunas
- Padding reduzido
- Font-sizes ajustados

---

## OBSERVAÇÕES TÉCNICAS

1. **Compatibilidade IE**: Não suportado (usa ES6+ sem transpile)
2. **Service Worker**: Requer HTTPS (ou localhost)
3. **LocalStorage**: Síncrono (pode causar bloqueio em grandes datasets)
4. **Encoding**: UTF-8 com BOM para compatibilidade Excel Windows

---

## PRÓXIMAS EVOLUÇÕES SUGERIDAS

1. IndexedDB para datasets maiores
2. Export para XLSX nativo
3. Importação de CSV
4. Filtros e busca na tabela
5. Relatórios analíticos
6. Backup para cloud (opcional)
7. Validação de patrimônios duplicados
