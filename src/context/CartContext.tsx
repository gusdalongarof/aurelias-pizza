'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { CartItem, CartItemPizza, CartItemBebida, Bebida, Config } from '@/types/pizzaria'

interface CartContextType {
  itens: CartItem[]
  adicionarPizza: (pizza: Omit<CartItemPizza, 'id' | 'tipo' | 'quantidade'>) => void
  adicionarBebida: (bebida: Bebida, quantidade?: number) => void
  alterarQuantidade: (id: string, delta: number) => void
  removerItem: (id: string) => void
  obterQuantidadeBebida: (bebidaId: number) => number
  limparCarrinho: () => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  abrirCarrinho: () => void
  fecharCarrinho: () => void
  observacao: string
  setObservacao: (obs: string) => void
  config: Config
  setConfig: (config: Config) => void
  subtotal: number
  taxaEntrega: number | null
  distanciaKm: number | null
  definirTaxaEntrega: (taxaEntrega: number, distanciaKm: number) => void
  limparTaxaEntrega: () => void
  total: number
  atingiuPedidoMinimo: boolean
  valorRestantePedidoMinimo: number
  quantidadeTotal: number
}

const configPadrao: Config = {
  aberta: true,
  pedido_minimo: 30,
  taxa_entrega_padrao: 8,
  taxa_entrega_por_km: 0,
  endereco_loja: null,
  aviso_entrega: 'Entregamos no perímetro urbano.',
  telefone_whats: '5555992323508',
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({
  children,
  config: configInicial,
}: {
  children: React.ReactNode
  config?: Config
}) {
  const [itens, setItens] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [observacao, setObservacao] = useState('')
  const [config, setConfig] = useState<Config>(configInicial || configPadrao)
  const [taxaEntrega, setTaxaEntrega] = useState<number | null>(null)
  const [distanciaKm, setDistanciaKm] = useState<number | null>(null)

  // Atualiza config se vier nova prop
  useEffect(() => {
    if (configInicial) {
      setConfig(configInicial)
    }
  }, [configInicial])

  // Recupera do sessionStorage
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem('aurelias_cart')
      if (salvo) {
        setItens(JSON.parse(salvo))
      }
      const obsSalva = sessionStorage.getItem('aurelias_cart_obs')
      if (obsSalva) {
        setObservacao(obsSalva)
      }
    } catch {
      // SSR
    }
  }, [])

  // Salva no sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('aurelias_cart', JSON.stringify(itens))
      sessionStorage.setItem('aurelias_cart_obs', observacao)
    } catch {
      // Ignora erro
    }
  }, [itens, observacao])

  const adicionarPizza = (pizzaData: Omit<CartItemPizza, 'id' | 'tipo' | 'quantidade'>) => {
    const novoItem: CartItemPizza = {
      ...pizzaData,
      id: `pizza-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      tipo: 'pizza',
      quantidade: 1,
    }
    setItens((prev) => [...prev, novoItem])
  }

  const adicionarBebida = (bebida: Bebida, quantidade: number = 1) => {
    setItens((prev) => {
      const index = prev.findIndex(
        (item) => item.tipo === 'bebida' && item.bebida.id === bebida.id
      )

      if (index >= 0) {
        const itemExistente = prev[index] as CartItemBebida
        const novaQtd = itemExistente.quantidade + quantidade
        if (novaQtd <= 0) {
          return prev.filter((_, i) => i !== index)
        }
        const copia = [...prev]
        copia[index] = { ...itemExistente, quantidade: novaQtd }
        return copia
      } else if (quantidade > 0) {
        const novoItem: CartItemBebida = {
          id: `bebida-${bebida.id}`,
          tipo: 'bebida',
          bebida,
          precoUnitario: bebida.preco,
          quantidade,
        }
        return [...prev, novoItem]
      }
      return prev
    })
  }

  const alterarQuantidade = (id: string, delta: number) => {
    setItens((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const novaQtd = item.quantidade + delta
            if (novaQtd <= 0) return null
            return { ...item, quantidade: novaQtd }
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    })
  }

  const removerItem = (id: string) => {
    setItens((prev) => prev.filter((item) => item.id !== id))
  }

  const obterQuantidadeBebida = (bebidaId: number): number => {
    const item = itens.find(
      (it) => it.tipo === 'bebida' && it.bebida.id === bebidaId
    ) as CartItemBebida | undefined
    return item ? item.quantidade : 0
  }

  const limparCarrinho = () => {
    setItens([])
    setObservacao('')
    setTaxaEntrega(null)
    setDistanciaKm(null)
  }

  const definirTaxaEntrega = (novaTaxa: number, novaDistanciaKm: number) => {
    setTaxaEntrega(novaTaxa)
    setDistanciaKm(novaDistanciaKm)
  }

  const limparTaxaEntrega = () => {
    setTaxaEntrega(null)
    setDistanciaKm(null)
  }

  const abrirCarrinho = () => setIsCartOpen(true)
  const fecharCarrinho = () => setIsCartOpen(false)

  // Cálculos
  const subtotal = itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0)
  const pedidoMinimo = config?.pedido_minimo ?? 30
  const atingiuPedidoMinimo = subtotal >= pedidoMinimo
  const valorRestantePedidoMinimo = Math.max(0, pedidoMinimo - subtotal)
  const total = subtotal > 0 ? subtotal + (taxaEntrega ?? 0) : 0
  const quantidadeTotal = itens.reduce((acc, item) => acc + item.quantidade, 0)

  return (
    <CartContext.Provider
      value={{
        itens,
        adicionarPizza,
        adicionarBebida,
        alterarQuantidade,
        removerItem,
        obterQuantidadeBebida,
        limparCarrinho,
        isCartOpen,
        setIsCartOpen,
        abrirCarrinho,
        fecharCarrinho,
        observacao,
        setObservacao,
        config,
        setConfig,
        subtotal,
        taxaEntrega,
        distanciaKm,
        definirTaxaEntrega,
        limparTaxaEntrega,
        total,
        atingiuPedidoMinimo,
        valorRestantePedidoMinimo,
        quantidadeTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider')
  }
  return context
}
