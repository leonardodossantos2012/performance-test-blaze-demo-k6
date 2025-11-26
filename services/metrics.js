/**
 * Serviço para métricas customizadas do k6
 */
import { Rate } from 'k6/metrics';

/**
 * Métrica customizada para taxa de sucesso de compras
 */
export const purchaseSuccessRate = new Rate('purchase_success');

