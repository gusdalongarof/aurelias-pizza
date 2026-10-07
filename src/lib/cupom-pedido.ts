import { brl, formatDataHora } from '@/lib/format'
import type { Pedido } from '@/types/pedido'

/**
 * Cupom do pedido para impressora térmica 80mm (Oásis OIA-8388 no PC do
 * amigo). Imprime por um iframe oculto com `window.print()` — para sair sem
 * a janela de confirmação, o Chrome desse PC precisa ser aberto com
 * `--kiosk-printing` e a térmica precisa ser a impressora padrão do Windows.
 *
 * Conteúdo com 45mm de largura, encostado à esquerda: com 72mm (e 50mm) a térmica
 * cortava o lado direito. Texto longo quebra em mais linhas.
 */

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão (na entrega)',
  dinheiro: 'Dinheiro',
}

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function montarHtmlCupom(pedido: Pedido) {
  const itens = pedido.pedido_itens
    .map((item) => {
      const descricao =
        item.tipo === 'pizza'
          ? `${esc(
              `Pizza ${item.tamanhos?.nome ?? ''} — ${item.pedido_item_sabores
                .map((s) => s.sabores?.nome)
                .join(' + ')}`
            )}<br><span class="sub">Borda: ${esc(item.bordas?.nome ?? '-')}</span>`
          : esc(`${item.bebidas?.nome ?? ''} ${item.bebidas?.volume ?? ''}`.trim())
      return `
        <tr>
          <td class="qtd">${item.quantidade}x</td>
          <td>${descricao}${
            item.observacao ? `<br><span class="sub">Obs: ${esc(item.observacao)}</span>` : ''
          }</td>
          <td class="valor">${brl(item.preco_unit * item.quantidade)}</td>
        </tr>`
    })
    .join('')

  const pagamento = FORMA_PAGAMENTO_LABEL[pedido.forma_pagamento] ?? pedido.forma_pagamento
  const troco =
    pedido.forma_pagamento === 'dinheiro' && pedido.troco_para
      ? `<p>Troco para: <b>${brl(pedido.troco_para)}</b></p>`
      : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(pedido.codigo || `Pedido ${pedido.id}`)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 45mm; margin: 0; padding: 2mm 0 6mm 1mm; font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; overflow-wrap: anywhere; }
  h1 { font-size: 14px; text-align: center; margin: 0 0 2px; }
  .codigo { font-size: 18px; font-weight: bold; text-align: center; margin: 4px 0; }
  .centro { text-align: center; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { vertical-align: top; padding: 2px 0; }
  .qtd { width: 6mm; font-weight: bold; }
  .valor { width: 16mm; text-align: right; white-space: nowrap; padding-left: 1mm; }
  .sub { font-size: 10px; }
  .linha { display: flex; justify-content: space-between; gap: 2mm; }
  .linha span:last-child { white-space: nowrap; }
  .total { font-size: 14px; font-weight: bold; }
  .obs { border: 1px solid #000; padding: 3px; margin-top: 4px; font-weight: bold; }
</style>
</head>
<body>
  <h1>Aurelia's Pizzaria</h1>
  <p class="centro">${formatDataHora(pedido.criado_em)}</p>
  <p class="codigo">${esc(pedido.codigo || `#${pedido.id}`)}</p>
  <hr>
  <p><b>${esc(pedido.cliente_nome)}</b></p>
  <p>Fone: ${esc(pedido.cliente_fone)}</p>
  ${pedido.tipo_entrega === 'entrega' ? `<p>${esc(pedido.endereco ?? '')}${pedido.bairro ? ` — ${esc(pedido.bairro)}` : ''}</p>` : '<p><b>RETIRADA NO BALCÃO</b></p>'}
  <hr>
  <table>${itens}</table>
  ${pedido.observacao ? `<p class="obs">OBS: ${esc(pedido.observacao)}</p>` : ''}
  <hr>
  <p class="linha"><span>Subtotal</span><span>${brl(pedido.subtotal)}</span></p>
  ${pedido.desconto > 0 ? `<p class="linha"><span>Desconto</span><span>-${brl(pedido.desconto)}</span></p>` : ''}
  <p class="linha"><span>Entrega</span><span>${brl(pedido.taxa_entrega)}</span></p>
  <p class="linha total"><span>TOTAL</span><span>${brl(pedido.total)}</span></p>
  <hr>
  <p>Pagamento: <b>${esc(pagamento)}</b></p>
  ${troco}
</body>
</html>`
}

export function imprimirCupom(pedido: Pedido) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(montarHtmlCupom(pedido))
  doc.close()

  // print() bloqueia até o diálogo fechar (ou retorna logo com --kiosk-printing);
  // remove o iframe depois, com folga para o spooler receber o trabalho.
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(() => iframe.remove(), 1000)
  }, 100)
}
