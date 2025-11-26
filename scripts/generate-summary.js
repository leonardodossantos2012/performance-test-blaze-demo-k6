#!/usr/bin/env node

/**
 * Script para gerar summary do GitHub Actions a partir dos resultados do k6
 * O k6 com --out json gera um arquivo com múltiplas linhas JSON (JSONL)
 */

const fs = require('fs');
const path = process.argv[2];

if (!path || !fs.existsSync(path)) {
  console.error('Usage: node generate-summary.js <k6-results.json>');
  process.exit(1);
}

try {
  // k6 gera JSONL (JSON Lines) - cada linha é um objeto JSON
  const fileContent = fs.readFileSync(path, 'utf8');
  const lines = fileContent.trim().split('\n').filter(line => line.trim());
  
  // Processar todas as linhas e agregar métricas
  const metrics = {};
  let summaryData = null;
  
  lines.forEach(line => {
    try {
      const data = JSON.parse(line);
      
      // k6 salva métricas no formato: { type: 'Metric', data: {...} }
      if (data.type === 'Metric') {
        const metricName = data.data.name;
        if (!metrics[metricName]) {
          metrics[metricName] = {
            values: {},
            thresholds: {}
          };
        }
        
        // Atualizar valores da métrica
        if (data.data.values) {
          Object.assign(metrics[metricName].values, data.data.values);
        }
      }
      
      // Última linha geralmente tem o resumo completo
      if (data.type === 'Summary') {
        summaryData = data;
        // Se tiver métricas no summary, usar elas
        if (data.metrics) {
          Object.keys(data.metrics).forEach(metricName => {
            if (!metrics[metricName]) {
              metrics[metricName] = { values: {} };
            }
            if (data.metrics[metricName].values) {
              Object.assign(metrics[metricName].values, data.metrics[metricName].values);
            }
          });
        }
      }
    } catch (e) {
      // Ignorar linhas inválidas
    }
  });
  
  // Se não encontrou métricas no formato JSONL, tentar como JSON único
  if (Object.keys(metrics).length === 0) {
    try {
      const singleJson = JSON.parse(fileContent);
      if (singleJson.metrics) {
        Object.assign(metrics, singleJson.metrics);
      }
    } catch (e) {
      // Não é JSON único, já processamos como JSONL
    }
  }
  
  // Extrair métricas principais
  const httpReqDuration = metrics['http_req_duration'] || {};
  const httpReqs = metrics['http_reqs'] || {};
  const httpReqFailed = metrics['http_req_failed'] || {};
  const purchaseSuccess = metrics['purchase_success'] || {};
  const iterations = metrics['iterations'] || {};
  const vus = metrics['vus'] || {};
  
  // Extrair valores - k6 usa diferentes formatos
  const getValue = (obj, key) => {
    if (!obj || !obj.values) return 0;
    return obj.values[key] || obj.values[`p(${key.replace('p', '')})`] || 0;
  };
  
  const p90 = getValue(httpReqDuration, 'p90') || getValue(httpReqDuration, '90');
  const p95 = getValue(httpReqDuration, 'p95') || getValue(httpReqDuration, '95');
  const p99 = getValue(httpReqDuration, 'p99') || getValue(httpReqDuration, '99');
  const avgDuration = httpReqDuration.values?.avg || 0;
  const minDuration = httpReqDuration.values?.min || 0;
  const maxDuration = httpReqDuration.values?.max || 0;
  
  const totalRequests = httpReqs.values?.count || 0;
  const requestsPerSecond = httpReqs.values?.rate || 0;
  
  const failedRate = httpReqFailed.values?.rate || 0;
  const failedCount = httpReqFailed.values?.count || 0;
  
  const successRate = purchaseSuccess.values?.rate || 0;
  const successCount = purchaseSuccess.values?.count || 0;
  
  const totalIterations = iterations.values?.count || 0;
  const maxVUs = vus.values?.max || 0;
  const minVUs = vus.values?.min || 0;
  
  // Thresholds
  const p90Threshold = 2000; // 2 segundos
  const failedThreshold = 0.01; // 1%
  const successThreshold = 0.95; // 95%
  
  // Verificar se os thresholds foram atendidos
  const p90Passed = p90 < p90Threshold;
  const failedPassed = failedRate < failedThreshold;
  const successPassed = successRate > successThreshold;
  const allPassed = p90Passed && failedPassed && successPassed;
  
  // Gerar summary em Markdown
  console.log('## 📊 Performance Test Results\n');
  
  // Status geral
  if (allPassed) {
    console.log('### ✅ All Thresholds Passed\n');
  } else {
    console.log('### ❌ Some Thresholds Failed\n');
  }
  
  // Métricas de Requisições HTTP
  console.log('### 🌐 HTTP Request Metrics\n');
  console.log('| Metric | Value | Status |');
  console.log('|--------|-------|--------|');
  console.log(`| Total Requests | ${totalRequests.toLocaleString()} | - |`);
  console.log(`| Requests/sec | ${requestsPerSecond.toFixed(2)} | ${requestsPerSecond >= 250 ? '✅' : '⚠️'} |`);
  console.log(`| Failed Requests | ${failedCount.toLocaleString()} (${(failedRate * 100).toFixed(2)}%) | ${failedPassed ? '✅' : '❌'} |`);
  
  // Métricas de Duração
  console.log('\n### ⏱️ Response Time Metrics\n');
  console.log('| Percentile | Value | Threshold | Status |');
  console.log('|------------|-------|-----------|--------|');
  console.log(`| Average | ${avgDuration.toFixed(2)}ms | - | - |`);
  console.log(`| Min | ${minDuration.toFixed(2)}ms | - | - |`);
  console.log(`| Max | ${maxDuration.toFixed(2)}ms | - | - |`);
  console.log(`| **p90** | **${p90.toFixed(2)}ms** | **< 2000ms** | ${p90Passed ? '✅' : '❌'} |`);
  console.log(`| p95 | ${p95.toFixed(2)}ms | - | - |`);
  console.log(`| p99 | ${p99.toFixed(2)}ms | - | - |`);
  
  // Métricas de Negócio
  console.log('\n### 🎯 Business Metrics\n');
  console.log('| Metric | Value | Threshold | Status |');
  console.log('|--------|-------|-----------|--------|');
  console.log(`| Purchase Success Rate | ${(successRate * 100).toFixed(2)}% | > 95% | ${successPassed ? '✅' : '❌'} |`);
  console.log(`| Successful Purchases | ${successCount.toLocaleString()} | - | - |`);
  console.log(`| Total Iterations | ${totalIterations.toLocaleString()} | - | - |`);
  
  // Métricas de Carga
  console.log('\n### 👥 Virtual Users\n');
  console.log('| Metric | Value |');
  console.log('|--------|-------|');
  console.log(`| Min VUs | ${minVUs} |`);
  console.log(`| Max VUs | ${maxVUs} |`);
  
  // Resumo dos Thresholds
  console.log('\n### 📋 Thresholds Summary\n');
  console.log('| Threshold | Target | Actual | Status |');
  console.log('|-----------|--------|--------|--------|');
  console.log(`| p90 Response Time | < 2000ms | ${p90.toFixed(2)}ms | ${p90Passed ? '✅ Passed' : '❌ Failed'} |`);
  console.log(`| Failed Requests | < 1% | ${(failedRate * 100).toFixed(2)}% | ${failedPassed ? '✅ Passed' : '❌ Failed'} |`);
  console.log(`| Purchase Success | > 95% | ${(successRate * 100).toFixed(2)}% | ${successPassed ? '✅ Passed' : '❌ Failed'} |`);
  
  // Notas
  console.log('\n---\n');
  console.log('📦 **Artifacts**: Check the workflow artifacts for detailed JSON and CSV reports.');
  
} catch (error) {
  console.error('## ❌ Error parsing results\n');
  console.error(`Error: ${error.message}\n`);
  console.error('Please check the k6 results file format.');
  process.exit(1);
}
