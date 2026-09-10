'use client'

import { useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import type { Config } from '@/types/pizzaria'

export default function ConfigSync({ config }: { config: Config }) {
  const { setConfig } = useCart()

  useEffect(() => {
    if (config) {
      setConfig(config)
    }
  }, [config, setConfig])

  return null
}
