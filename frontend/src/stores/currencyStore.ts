import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP'

interface CurrencyState {
  currency: SupportedCurrency
  currentCurrency: SupportedCurrency
  rates: Record<string, number> // Base EUR exchange rates from ECB
  setCurrency: (c: SupportedCurrency) => void
  setFxRates: (data: { EUR_USD?: number; EUR_GBP?: number; rates?: Record<string, number> }) => void
  convertAmount: (amount: number, fromCurrency?: string, targetCurrency?: SupportedCurrency) => number
  formatMoney: (amount: number, assetCurrency?: string) => string
  formatBaseMoney: (amountInBase: number, targetCurrency?: SupportedCurrency) => string
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'EUR',
      currentCurrency: 'EUR',
      rates: {
        EUR: 1.0,
        USD: 1.1643,
        JPY: 185.92,
        GBP: 0.8572,
        CHF: 0.9364,
        CAD: 1.6130,
        AUD: 1.6183,
      },

      setCurrency: (currency) => set({ currency, currentCurrency: currency }),

      setFxRates: (data) => {
        const currentRates = get().rates
        const incomingRates = data.rates || {}
        const newRates: Record<string, number> = {
          ...currentRates,
          ...incomingRates,
          EUR: 1.0,
          USD: data.EUR_USD || incomingRates.USD || currentRates.USD || 1.1643,
          GBP: data.EUR_GBP || incomingRates.GBP || currentRates.GBP || 0.8572,
        }
        set({ rates: newRates })
      },

      convertAmount: (amount: number, fromCurrency: string = 'EUR', targetCurrency?: SupportedCurrency) => {
        const { currency: userBaseCurrency, rates } = get()
        const target = targetCurrency || userBaseCurrency || 'EUR'
        const from = (fromCurrency || 'EUR').toUpperCase().trim()

        if (isNaN(amount) || amount === 0 || amount === undefined || amount === null) return 0
        if (from === target) return amount

        // Convert source currency to EUR base
        const fromRateInEur = rates[from] || (from === 'USD' ? rates.USD : from === 'GBP' ? rates.GBP : 1.0)
        const amountInEur = from === 'EUR' ? amount : amount / (fromRateInEur || 1.0)

        // Convert EUR base to target
        if (target === 'EUR') return amountInEur
        const targetRate = rates[target] || (target === 'USD' ? rates.USD : target === 'GBP' ? rates.GBP : 1.0)
        return amountInEur * (targetRate || 1.0)
      },

      // Formats portfolio total valuation in the user's chosen base display currency with true FX cross computation
      formatBaseMoney: (amountInBase: number, targetCurrency?: SupportedCurrency) => {
        const { currency: userCurrency, rates } = get()
        const target = targetCurrency || userCurrency || 'EUR'
        if (isNaN(amountInBase) || amountInBase === undefined || amountInBase === null) {
          return target === 'GBP' ? '£0.00' : target === 'USD' ? '$0.00' : '€0.00'
        }

        const isNegative = amountInBase < 0
        const absVal = Math.abs(amountInBase)
        const rate = rates[target] || (target === 'USD' ? rates.USD || 1.1643 : target === 'GBP' ? rates.GBP || 0.8572 : 1.0)
        const converted = absVal * rate
        const formatted = converted.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

        const sign = isNegative ? '-' : ''
        if (target === 'GBP') return `${sign}£${formatted}`
        if (target === 'USD') return `${sign}$${formatted}`
        return `${sign}€${formatted}`
      },

      // Formats an asset's price or portfolio value:
      // If assetCurrency is omitted, 'EUR', or matches the user's current currency,
      // it treats the amount as a base portfolio/asset value in EUR and converts to active currency.
      // If assetCurrency is an explicit foreign currency (e.g. USD for AAPL quote while viewing in EUR),
      // it displays in that native currency.
      formatMoney: (amount: number, assetCurrency?: string) => {
        if (isNaN(amount) || amount === undefined || amount === null) return '€0.00'
        const { currency: userBaseCurrency, formatBaseMoney } = get()
        const curr = (assetCurrency || userBaseCurrency).toUpperCase().trim()

        // If assetCurrency is EUR/BASE and the user has chosen USD or GBP, convert from EUR base to user's currency
        if ((curr === 'EUR' || curr === 'BASE') && userBaseCurrency !== 'EUR') {
          return formatBaseMoney(amount)
        }

        // If assetCurrency matches current user currency (e.g. formatMoney(val, currentCurrency)),
        // this is a request to format a base-denominated metric into the active currency
        if (curr === userBaseCurrency && userBaseCurrency !== 'EUR') {
          return formatBaseMoney(amount)
        }

        const isNegative = amount < 0
        const absVal = Math.abs(amount)
        const sign = isNegative ? '-' : ''
        const formatted = absVal.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

        if (curr === 'EUR') return `${sign}€${formatted}`
        if (curr === 'GBP') return `${sign}£${formatted}`
        if (curr === 'JPY') return `${sign}¥${Math.round(absVal).toLocaleString('ja-JP')}`
        if (curr === 'CHF') return `${sign}CHF ${formatted}`
        return `${sign}$${formatted}`
      },
    }),
    {
      name: 'wealthos-currency-storage',
    }
  )
)
