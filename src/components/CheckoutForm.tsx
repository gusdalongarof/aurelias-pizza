'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { brl } from '@/lib/format'
import type { Bairro, FormaPagamento } from '@/types/pizzaria'
import type { NovoPedidoPayload } from '@/types/pedido'

const INTERIOR = 'interior'

export default function CheckoutForm({ bairros }: { bairros: Bairro[] }) {
  const router = useRouter()
  const {
    itens,
    observacao,
    setObservacao,
    subtotal,
    desconto,
    freteGratis,
    definirTaxaEntrega,
    limparTaxaEntrega,
    config,
    limparCarrinho,
    atualizarPrecos,
  } = useCart()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairroSel, setBairroSel] = useState('')
  const [localidade, setLocalidade] = useState('')
  const [complemento, setComplemento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [trocoPara, setTrocoPara] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [codigoPedido, setCodigoPedido] = useState<string | null>(null)
  const [totalFinal, setTotalFinal] = useState<number | null>(null)
  const [copiado, setCopiado] = useState<'codigo' | 'link' | null>(null)

  const ehInterior = bairroSel === INTERIOR
  const bairroEscolhido = bairros.find((b) => String(b.id) === bairroSel)
  const taxaBairro = ehInterior ? config.taxa_entrega_interior : (bairroEscolhido?.taxa_entrega ?? null)
  // Taxa derivada da escolha nesta tela (não do contexto), pra não herdar
  // um bairro escolhido numa visita anterior ao checkout.
  const taxaEntrega = freteGratis ? 0 : taxaBairro
  const total = subtotal > 0 ? Math.round((subtotal - desconto + (taxaEntrega ?? 0)) * 100) / 100 : 0
  const nomeBairro = ehInterior ? `Interior — ${localidade.trim()}` : (bairroEscolhido?.nome ?? '')

  const escolherBairro = (valor: string) => {
    setBairroSel(valor)
    const b = bairros.find((x) => String(x.id) === valor)
    if (valor === INTERIOR) definirTaxaEntrega(config.taxa_entrega_interior)
    else if (b) definirTaxaEntrega(b.taxa_entrega)
    else limparTaxaEntrega()
  }

  // Carrinho vazio
  if (itens.length === 0 && !pedidoEnviado) {
    return (
      <main className="min-h-screen bg-[#0D1410] px-4 py-20 text-[#E0E8DF]">
        <div className="mx-auto max-w-sm text-center">
          <p className="text-5xl opacity-20 mb-6">🛒</p>
          <h1 className="text-xl font-bold text-[#D0D8D0]" style={{ fontFamily: 'var(--font-serif)' }}>
            Carrinho vazio
          </h1>
          <p className="mt-2 text-sm text-[#3D5040]">
            Adicione itens ao cardápio antes de finalizar o pedido.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#3A5630] hover:bg-[#47683B] px-6 py-3 text-sm font-semibold text-white"
          >
            ← Voltar ao Cardápio
          </Link>
        </div>
      </main>
    )
  }

  // Confirmação após envio
  if (pedidoEnviado) {
    const copiar = async (qual: 'codigo' | 'link', texto: string) => {
      try {
        await navigator.clipboard.writeText(texto)
        setCopiado(qual)
        setTimeout(() => setCopiado(null), 2500)
      } catch {
        // sem permissão de área de transferência — o número continua na tela (select-all)
      }
    }

    return (
      <main className="min-h-screen bg-[#0D1410] px-4 py-16 text-[#E0E8DF]">
        <div className="mx-auto max-w-md rounded-2xl border border-[#1C2920] bg-[#111813] p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#192519] text-[#6A9960] text-lg border border-[#2D4230]">
            ✓
          </div>
          <h1 className="text-xl font-bold text-[#D0D8D0]" style={{ fontFamily: 'var(--font-serif)' }}>
            Pedido recebido
          </h1>
          <p className="mt-2 text-sm text-[#7A8C78]">
            A Aurelia&apos;s Pizzaria já recebeu seu pedido.
          </p>

          {codigoPedido && (
            <div className="mt-6 rounded-xl border-2 border-[#C9A24F] bg-[#1A1710] p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#E0C27A]">
                Anote o número do seu pedido
              </p>
              <p className="mt-2 text-3xl font-bold tracking-wider text-[#F2DDA4] tabular-nums select-all">
                {codigoPedido}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[#B89A5A]">
                Com ele você acompanha o pedido a qualquer momento: no site, toque em{' '}
                <strong className="text-[#E0C27A]">&quot;Acompanhar pedido&quot;</strong> (no topo da página) e
                digite o número. Se falar com a loja, informe esse número também.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => copiar('codigo', codigoPedido)}
                  className="flex-1 rounded-lg border border-[#4A3F20] px-3 py-2 text-xs font-semibold text-[#E0C27A] hover:bg-[#241F12] cursor-pointer"
                >
                  {copiado === 'codigo' ? 'Copiado ✓' : 'Copiar número'}
                </button>
                <button
                  type="button"
                  onClick={() => copiar('link', `${window.location.origin}/pedido/${codigoPedido}`)}
                  className="flex-1 rounded-lg border border-[#4A3F20] px-3 py-2 text-xs font-semibold text-[#E0C27A] hover:bg-[#241F12] cursor-pointer"
                >
                  {copiado === 'link' ? 'Copiado ✓' : 'Copiar link'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-[#0E1510] border border-[#1C2920] p-4 text-left text-xs space-y-1.5">
            <p className="font-semibold text-[#8AA087] mb-1 uppercase tracking-widest text-[10px]">
              Resumo
            </p>
            <p className="text-[#C8D5C7]">{nome} · {telefone}</p>
            <p className="text-[#526550]">{rua}, {numero} — {nomeBairro} {complemento && `(${complemento})`}</p>
            <p className="text-[#526550]">
              {formaPagamento === 'pix' ? 'Pix na entrega' : formaPagamento === 'cartao' ? 'Cartão na entrega' : `Dinheiro ${trocoPara ? `(troco p/ ${trocoPara})` : ''}`}
            </p>
            <p className="pt-2 font-bold preco">{brl(totalFinal ?? total)}</p>
          </div>

          {codigoPedido && (
            <Link
              href={`/pedido/${codigoPedido}`}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2E4030] px-6 py-3 text-sm font-semibold text-[#8AA087] hover:border-[#4A6A3F] hover:text-[#C8D5C7]"
            >
              Acompanhar pedido agora →
            </Link>
          )}

          <button
            type="button"
            onClick={() => { limparCarrinho(); router.push('/') }}
            className="btn-primary mt-3"
          >
            Voltar ao Cardápio
          </button>
        </div>
      </main>
    )
  }

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!nome.trim()) { setErro('Informe seu nome completo.'); return }
    if (!telefone.trim() || telefone.length < 8) { setErro('Informe um telefone válido.'); return }
    if (!rua.trim() || !numero.trim()) { setErro('Preencha o endereço completo (Rua e Número).'); return }
    if (!bairroSel || taxaEntrega === null) { setErro('Escolha o bairro de entrega.'); return }
    if (ehInterior && !localidade.trim()) { setErro('Informe a localidade no interior.'); return }

    const payload: NovoPedidoPayload = {
      cliente: { nome: nome.trim(), telefone: telefone.trim() },
      endereco: { rua: rua.trim(), numero: numero.trim(), bairroId: ehInterior ? null : Number(bairroSel), bairro: ehInterior ? localidade.trim() : nomeBairro, complemento: complemento.trim() },
      pagamento: { forma: formaPagamento, trocoPara: trocoPara.trim() || undefined },
      observacao: observacao.trim() || undefined,
      itens: itens.map((item) =>
        item.tipo === 'pizza'
          ? {
              tipo: 'pizza' as const,
              tamanhoId: item.tamanho.id,
              bordaId: item.borda.id,
              saborIds: item.sabores.map((s) => s.id),
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
            }
          : {
              tipo: 'bebida' as const,
              bebidaId: item.bebida.id,
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
            }
      ),
      subtotal,
      desconto,
      taxaEntrega,
      freteGratis,
    }

    setEnviando(true)
    try {
      const resp = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) {
        // Preço mudou desde que a pizza entrou no carrinho: o servidor manda
        // os valores certos e o resumo atualiza antes de o cliente tentar de novo.
        if (resp.status === 409 && Array.isArray(data.precos) && data.precos.length === itens.length) {
          atualizarPrecos(data.precos)
        }
        setErro(data.error || 'Não foi possível registrar o pedido.')
        return
      }
      // Total gravado pelo servidor (ele é quem decide frete grátis/desconto).
      setCodigoPedido(data.codigo)
      setTotalFinal(data.total)
      setPedidoEnviado(true)
    } catch {
      setErro('Falha de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0D1410] px-4 sm:px-6 py-8 pb-20 text-[#E0E8DF]">
      <div className="mx-auto max-w-4xl">
        {/* Header da página */}
        <div className="flex items-center justify-between border-b border-[#1A2318] pb-4 mb-10">
          <Link href="/" className="text-xs text-[#4D6150] hover:text-[#8AA087] transition-colors">
            ← Voltar ao cardápio
          </Link>
          <span className="text-xs text-[#2E4030] font-semibold uppercase tracking-widest">
            Finalizar Pedido
          </span>
        </div>

        {erro && (
          <div className="mb-6 rounded-xl bg-[#281A1A] border border-[#4A2525] px-4 py-3 text-sm text-[#C47070]">
            {erro}
          </div>
        )}

        <form onSubmit={handleFinalizar} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Formulário — 7 colunas */}
          <div className="space-y-6 lg:col-span-7">

            {/* Dados pessoais */}
            <div className="form-section">
              <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-4">
                Dados pessoais
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs text-[#4D6150] mb-1">Nome completo <span className="text-[#8A5050]">*</span></label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva" className="campo" />
                </div>
                <div>
                  <label className="block text-xs text-[#4D6150] mb-1">Telefone / WhatsApp <span className="text-[#8A5050]">*</span></label>
                  <input type="tel" required value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(55) 99999-9999" className="campo" />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="form-section">
              <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-4">
                Endereço de entrega
              </h2>
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-4">
                  <label className="block text-xs text-[#4D6150] mb-1">Rua / Avenida <span className="text-[#8A5050]">*</span></label>
                  <input type="text" required value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Av. Brasil" className="campo" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-[#4D6150] mb-1">Número <span className="text-[#8A5050]">*</span></label>
                  <input type="text" required value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="450" className="campo" />
                </div>
                <div className="col-span-6">
                  <label className="block text-xs text-[#4D6150] mb-1">Bairro <span className="text-[#8A5050]">*</span></label>
                  <select required value={bairroSel} onChange={(e) => escolherBairro(e.target.value)} className="campo">
                    <option value="">Escolha o bairro</option>
                    {bairros.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome}
                      </option>
                    ))}
                    <option value={INTERIOR}>Interior (fora da cidade)</option>
                  </select>
                </div>
                {ehInterior && (
                  <div className="col-span-6">
                    <label className="block text-xs text-[#4D6150] mb-1">Localidade (linha, comunidade) <span className="text-[#8A5050]">*</span></label>
                    <input type="text" required value={localidade} onChange={(e) => setLocalidade(e.target.value)} placeholder="Ex: Linha Bela União" className="campo" />
                  </div>
                )}
                <div className="col-span-3">
                  <label className="block text-xs text-[#4D6150] mb-1">Complemento / Referência</label>
                  <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto 12, casa azul" className="campo" />
                </div>
              </div>

              {freteGratis && (
                <p className="mt-4 rounded-xl bg-[#0E1510] border border-[#1C2920] p-4 text-xs text-[#8AA087]">
                  ✓ Frete grátis hoje, para qualquer bairro.
                </p>
              )}
            </div>

            {/* Pagamento */}
            <div className="form-section">
              <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-4">
                Forma de pagamento
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pix', label: 'Pix', sub: 'Pague na entrega' },
                  { id: 'cartao', label: 'Cartão', sub: 'Débito ou crédito na entrega' },
                  { id: 'dinheiro', label: 'Dinheiro', sub: 'Pagamento em espécie' },
                ].map((op) => {
                  const sel = formaPagamento === op.id
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setFormaPagamento(op.id as FormaPagamento)}
                      className={`rounded-xl p-3.5 text-left border cursor-pointer ${
                        sel ? 'border-[#4A6A3F] bg-[#192519]' : 'border-[#1C2920] bg-[#111813] hover:border-[#2E4030]'
                      }`}
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-[#D0D8D0]">{op.label}</span>
                        <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${sel ? 'border-[#6A9960]' : 'border-[#2E4030]'}`}>
                          {sel && <div className="h-1.5 w-1.5 rounded-full bg-[#6A9960]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#3D5040]">{op.sub}</p>
                    </button>
                  )
                })}
              </div>

              {formaPagamento === 'dinheiro' && (
                <div className="mt-3">
                  <label className="block text-xs text-[#4D6150] mb-1">Precisa de troco? Para quanto?</label>
                  <input
                    type="text"
                    value={trocoPara}
                    onChange={(e) => setTrocoPara(e.target.value)}
                    placeholder="Ex: 100,00 (deixe vazio se não precisar)"
                    className="campo"
                  />
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="form-section">
              <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-4">
                Observações <span className="text-[#2E4030] font-normal normal-case tracking-normal">(opcional)</span>
              </h2>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: sem cebola em uma das metades, campaninha não funciona..."
                rows={3}
                className="campo resize-none"
              />
            </div>
          </div>

          {/* Resumo do pedido — 5 colunas */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 form-section space-y-5">
              <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest border-b border-[#1A2318] pb-3">
                Resumo do pedido
              </h2>

              <div className="max-h-72 overflow-y-auto space-y-3 pr-0.5">
                {itens.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[#0E1510] border border-[#1C2920] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-[#3D5040] font-semibold uppercase tracking-wider">
                          {item.tipo === 'pizza' ? `Pizza ${item.tamanho.nome}` : 'Bebida'}
                        </p>
                        <p className="mt-0.5 text-sm text-[#C8D5C7] font-medium">
                          {item.tipo === 'pizza'
                            ? item.sabores.map((s) => item.sabores.length > 1 ? `½ ${s.nome}` : s.nome).join(' + ')
                            : item.bebida.nome}
                        </p>
                        {item.tipo === 'pizza' && <p className="text-[11px] text-[#3D5040]">Borda: {item.borda.nome}</p>}
                        {item.tipo === 'bebida' && item.bebida.volume && (
                          <p className="text-[11px] text-[#3D5040]">{item.bebida.volume}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-[#3D5040]">{item.quantidade}×</p>
                        <p className="text-sm preco font-bold tabular-nums">{brl(item.precoUnitario * item.quantidade)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#1A2318] pt-4 space-y-2 text-xs text-[#4D6150]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-[#8AA087] tabular-nums">{brl(subtotal)}</span>
                </div>
                {desconto > 0 && (
                  <div className="flex justify-between">
                    <span>Desconto ({config.desconto_pedido_pct}%)</span>
                    <span className="text-[#8AA087] tabular-nums">−{brl(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Entrega</span>
                  <span className="text-[#8AA087] tabular-nums">
                    {freteGratis ? 'Grátis' : taxaEntrega === null ? 'Escolha o bairro' : brl(taxaEntrega)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#1A2318] pt-2 text-sm font-bold text-[#E0E8DF]">
                  <span>Total a pagar</span>
                  <span className="preco tabular-nums">{brl(total)}</span>
                </div>
              </div>

              <button type="submit" disabled={!bairroSel || enviando} className="btn-primary disabled:opacity-50">
                {!bairroSel
                  ? 'Escolha o bairro para continuar'
                  : enviando
                    ? 'Enviando pedido...'
                    : 'Finalizar pedido'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
