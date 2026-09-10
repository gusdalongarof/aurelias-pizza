'use client'

import React from 'react'
import { CartProvider } from '@/context/CartContext'
import type { Config } from '@/types/pizzaria'

export default function Providers({
  children,
  config,
}: {
  children: React.ReactNode
  config?: Config
}) {
  return <CartProvider config={config}>{children}</CartProvider>
}
