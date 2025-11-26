# Performance Test - BlazeDemo Flight Booking

Este projeto contém um script de teste de performance usando k6 para simular o fluxo completo de compra de passagem aérea no site [BlazeDemo](https://www.blazedemo.com).

## Requisitos

- [k6](https://k6.io/docs/getting-started/installation/) instalado

## Instalação do k6

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
Baixe o instalador em: https://k6.io/docs/getting-started/installation/

## Cenário de Teste

Todos os testes simulam o seguinte fluxo de compra de passagem aérea:

1. **Acessar página inicial** - GET `/`
2. **Buscar voos** - GET `/reserve.php?fromPort={origem}&toPort={destino}`
3. **Selecionar voo** - POST `/purchase.php` com dados do voo
4. **Preencher dados do passageiro** - POST `/confirmation.php` com dados pessoais e cartão
5. **Confirmar compra** - Verificar confirmação da compra

## Tipos de Testes

O projeto inclui dois tipos de testes de performance que validam diferentes aspectos do sistema:

### 1. Teste de Carga (`flight-booking-load-test.js`)

**Objetivo**: Validar o comportamento do sistema sob carga crescente e sustentada, simulando um crescimento gradual de usuários.

**Características**:
- **Executor**: `ramping-arrival-rate`
- **Perfil de Carga**:
  - **Ramp-up gradual**: 50 → 100 → 150 → 200 → 250 req/s (3 minutos)
    - Aumento suave e previsível da carga
    - Permite ao sistema se adaptar gradualmente
  - **Carga sustentada**: 250 req/s por 3 minutos
    - Valida se o sistema mantém performance estável sob carga constante
    - Testa capacidade de suportar a vazão do critério de aceitação
  - **Ramp-down**: 250 → 150 → 50 → 0 req/s (2.5 minutos)
    - Redução gradual para observar recuperação do sistema
- **Duração Total**: ~8.5 minutos
- **Quando usar**: 
  - Validar capacidade de escalabilidade do sistema
  - Identificar pontos de degradação gradual
  - Testar comportamento sob carga sustentada
  - Simular crescimento natural de tráfego

**Diferença chave**: O teste de carga aumenta a demanda **gradualmente**, dando tempo ao sistema para se adaptar e escalar recursos se necessário.

### 2. Teste de Pico (`flight-booking-spike-test.js`)

**Objetivo**: Validar a resiliência do sistema diante de aumentos súbitos e extremos de carga, simulando eventos como promoções relâmpago ou notícias virais.

**Características**:
- **Executor**: `ramping-arrival-rate`
- **Perfil de Carga**:
  - **Carga normal**: 50 req/s (1 minuto)
    - Estabelece baseline de performance
  - **Pico súbito**: 50 → 300 req/s em 30 segundos
    - Aumento extremamente rápido (6x em 30s)
    - Testa limites do sistema sem tempo de adaptação
  - **Mantém pico**: 300 req/s por 1 minuto
    - Valida se o sistema consegue lidar com sobrecarga temporária
  - **Retorna para 250 req/s**: mantém por 2 minutos
    - Valida que após o pico, o sistema atende ao critério de aceitação
  - **Redução**: volta para carga normal
- **Duração Total**: ~6 minutos
- **Quando usar**:
  - Testar resiliência a picos inesperados
  - Validar mecanismos de proteção (rate limiting, circuit breakers)
  - Identificar pontos de falha sob stress extremo
  - Simular eventos de tráfego imprevisível

**Diferença chave**: O teste de pico aumenta a demanda **súbita e drasticamente**, sem dar tempo ao sistema para se preparar, testando sua capacidade de lidar com situações extremas.

### Comparação: Teste de Carga vs Teste de Pico

| Aspecto | Teste de Carga | Teste de Pico |
|--------|----------------|---------------|
| **Velocidade de aumento** | Gradual (3 minutos para atingir 250 req/s) | Súbita (30 segundos para atingir 300 req/s) |
| **Tempo de adaptação** | Sistema tem tempo para escalar | Sistema não tem tempo para se preparar |
| **Objetivo principal** | Validar escalabilidade e capacidade sustentada | Validar resiliência e recuperação |
| **Cenário real** | Crescimento natural de usuários | Promoção relâmpago, notícia viral, evento |
| **Foco** | Performance sob carga constante | Comportamento sob stress extremo |
| **Validação** | Sistema mantém 250 req/s de forma estável | Sistema se recupera após pico e atende 250 req/s |

## Critérios de Aceitação

Todos os testes validam os seguintes critérios:

- ✅ **250 requisições por segundo** - Atingir e manter a vazão desejada
- ✅ **Tempo de resposta 90th percentil < 2 segundos** - Threshold: `http_req_duration: ['p(90)<2000']`
- ✅ **Taxa de sucesso de compra > 95%** - Métrica customizada `purchase_success`
- ✅ **Taxa de falhas HTTP < 1%** - Threshold: `http_req_failed: ['rate<0.01']`

## Execução dos Testes

### Execução Local

**Teste de Carga:**
```bash
k6 run tests/flight-booking-load-test.js
```

**Teste de Pico:**
```bash
k6 run tests/flight-booking-spike-test.js
```

### Executar com saída detalhada

```bash
# Teste de carga com relatórios
k6 run --out json=results-load.json --out csv=results-load.csv tests/flight-booking-load-test.js

# Teste de pico com relatórios
k6 run --out json=results-spike.json --out csv=results-spike.csv tests/flight-booking-spike-test.js
```

### Executar todos os testes em sequência

```bash
# Teste de carga
k6 run tests/flight-booking-load-test.js

# Teste de pico
k6 run tests/flight-booking-spike-test.js
```

## Configuração do Teste

O teste está configurado para:

- **Taxa de requisições**: 250 requisições por segundo
- **Duração**: 5 minutos
- **VUs pré-alocados**: 100
- **VUs máximos**: 500

### Ajustar a taxa de requisições

Para modificar a taxa de requisições, edite o arquivo `tests/flight-booking-purchase.js`:

```javascript
rate: 250, // Altere este valor
```

### Ajustar a duração

Para modificar a duração do teste, edite o arquivo `tests/flight-booking-purchase.js`:

```javascript
duration: '5m', // Exemplos: '1m', '10m', '30s'
```

## Resultados Esperados

O k6 exibirá métricas em tempo real durante a execução e um resumo final com:

- **http_req_duration**: Tempo de resposta das requisições (incluindo p90)
- **http_req_failed**: Taxa de falhas
- **purchase_success**: Taxa de sucesso das compras
- **iterations**: Número total de iterações
- **vus**: Número de usuários virtuais utilizados

### Exemplo de saída esperada

```
✓ homepage status is 200
✓ reserve status is 200
✓ reserve page contains flights
✓ purchase status is 200
✓ purchase page loaded
✓ confirmation status is 200
✓ purchase confirmed

checks.........................: 100.00% ✓ 75000    ✗ 0
data_received..................: 45 MB   150 kB/s
data_sent......................: 12 MB   40 kB/s
http_req_duration..............: avg=450ms  min=120ms  med=380ms  max=1.8s   p(90)=1.2s
http_req_failed................: 0.00%   ✓ 0        ✗ 0
http_reqs......................: 125000  416.67/s
iteration_duration.............: avg=2.1s   min=1.5s   med=2.0s   max=3.5s
purchase_success...............: 100.00% ✓ 25000    ✗ 0
vus............................: 250     min=100    max=500
```

## CI/CD - GitHub Actions

O projeto inclui um workflow do GitHub Actions para execução manual dos testes de performance.

### Execução Manual

O workflow é executado **apenas manualmente** via `workflow_dispatch`. Não há triggers automáticos configurados.

### Workflow Features

- ✅ **Instalação automática do k6** no runner
- ✅ **Execução dos testes** com geração de relatórios JSON e CSV
- ✅ **Summary no GitHub Actions** com métricas principais e status dos thresholds
- ✅ **Artifacts** com relatórios detalhados (disponíveis por 30 dias)
- ✅ **Validação de thresholds** - o workflow falha se os critérios não forem atendidos

### Visualizar Resultados

1. **Summary**: Após a execução, o summary aparece na aba "Summary" do workflow run
2. **Artifacts**: Baixe os relatórios JSON e CSV na seção "Artifacts" do workflow run
3. **Logs**: Veja os logs completos na aba "Actions" do repositório

### Como Executar

Para executar o workflow:

1. Vá para a aba **Actions** no GitHub
2. Selecione o workflow **Performance Tests**
3. Clique em **Run workflow**
4. Selecione o **Tipo de teste**:
   - **load**: Teste de carga (ramp-up gradual até 250 req/s, mantém por 3 min)
   - **spike**: Teste de pico (pico súbito até 300 req/s, depois retorna para 250 req/s)
5. Clique em **Run workflow** para iniciar

**Recomendação**: Execute primeiro o teste de carga para validar a capacidade básica, depois o teste de pico para validar a resiliência.

### Exemplo de Summary

O summary gerado inclui:

- 📊 Status geral dos thresholds
- 🌐 Métricas de requisições HTTP (total, taxa, falhas)
- ⏱️ Métricas de tempo de resposta (avg, min, max, p90, p95, p99)
- 🎯 Métricas de negócio (taxa de sucesso de compras)
- 👥 Métricas de carga (VUs utilizados)
- 📋 Resumo dos thresholds com status

## Estrutura do Projeto

```
.
├── .github/
│   └── workflows/
│       └── performance-test.yml      # Workflow do GitHub Actions
├── services/                          # Serviços auxiliares
│   ├── data-generator.js             # Geração de dados aleatórios
│   ├── flight-service.js             # Lógica de negócio para voos
│   └── metrics.js                    # Métricas customizadas do k6
├── scripts/                           # Scripts auxiliares
│   └── generate-summary.js           # Gera summary do GitHub Actions
├── tests/                            # Scripts de teste
│   ├── flight-booking-load-test.js   # Teste de carga (ramp-up gradual)
│   └── flight-booking-spike-test.js  # Teste de pico (aumento súbito)
├── .gitignore                        # Arquivos ignorados pelo git
└── README.md                         # Este arquivo
```

### Descrição dos Serviços

- **data-generator.js**: Contém funções para gerar dados aleatórios de passageiros e selecionar cidades de origem/destino
- **flight-service.js**: Contém funções para extrair informações de voos e construir URLs
- **metrics.js**: Define métricas customizadas do k6 (ex: taxa de sucesso de compras)

## Notas Importantes

- O teste gera dados aleatórios para cada compra (nome, endereço, cartão de crédito)
- As cidades de origem e destino são selecionadas aleatoriamente
- O script tenta extrair automaticamente o número do voo e preço da página de resultados
- Um pequeno delay (0.5s) é adicionado entre iterações para simular comportamento humano

## Troubleshooting

### Erro: "k6: command not found"
Certifique-se de que o k6 está instalado e no PATH do sistema.

### Thresholds não sendo atendidos
- Verifique a carga do servidor alvo
- Ajuste a taxa de requisições se necessário
- Verifique a conexão de rede

### Taxa de sucesso baixa
- Verifique se o site está acessível
- Verifique se os padrões de extração de dados do voo estão corretos
- Ajuste os checks de validação se necessário

