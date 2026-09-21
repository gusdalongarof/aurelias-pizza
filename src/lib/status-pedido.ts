import type { PedidoStatus } from '@/types/pedido'

export const ORDEM_STATUS: PedidoStatus[] = ['novo', 'aceito', 'em_preparo', 'saiu_entrega', 'entregue']

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  novo: 'Novo',
  aceito: 'Aceito',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  recusado: 'Recusado',
}

export const STATUS_COR: Record<PedidoStatus, string> = {
  novo: 'bg-[#3A5630] text-white',
  aceito: 'bg-[#2E4030] text-[#C8D5C7]',
  em_preparo: 'bg-[#4A3A1A] text-[#E5C07B]',
  saiu_entrega: 'bg-[#1A3A4A] text-[#7BB8E5]',
  entregue: 'bg-[#192519] text-[#6A9960]',
  recusado: 'bg-[#281A1A] text-[#C47070]',
}
