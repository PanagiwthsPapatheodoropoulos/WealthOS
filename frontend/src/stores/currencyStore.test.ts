import { describe, it, expect, beforeEach } from 'vitest'
import { useCurrencyStore } from '@/stores/currencyStore'

describe('currencyStore FX cross conversion and formatting', () => {
  beforeEach(() => {
    localStorage.clear()
    useCurrencyStore.setState({
      currency: 'EUR',
      currentCurrency: 'EUR',
      rates: {
        EUR: 1.0,
        USD: 1.1643,
        GBP: 0.8572,
        JPY: 185.92,
        CHF: 0.9364,
      },
    })
  })

  it('formats EUR base values accurately in EUR mode', () => {
    const { formatBaseMoney, formatMoney } = useCurrencyStore.getState()
    expect(formatBaseMoney(1000)).toBe('€1,000.00')
    expect(formatMoney(1000, 'EUR')).toBe('€1,000.00')
  })

  it('computes true FX cross when switched to USD ($1,000 EUR -> $1,164.30 USD)', () => {
    useCurrencyStore.getState().setCurrency('USD')
    const { formatBaseMoney, formatMoney } = useCurrencyStore.getState()

    // $1000 EUR * 1.1643 = $1,164.30
    expect(formatBaseMoney(1000)).toBe('$1,164.30')
    expect(formatMoney(1000, 'EUR')).toBe('$1,164.30')
    expect(formatMoney(1000, 'USD')).toBe('$1,164.30')
  })

  it('computes true FX cross when switched to GBP (€1,000 EUR -> £857.20 GBP)', () => {
    useCurrencyStore.getState().setCurrency('GBP')
    const { formatBaseMoney, formatMoney } = useCurrencyStore.getState()

    // 1000 EUR * 0.8572 = £857.20
    expect(formatBaseMoney(1000)).toBe('£857.20')
    expect(formatMoney(1000, 'EUR')).toBe('£857.20')
    expect(formatMoney(1000, 'GBP')).toBe('£857.20')
  })

  it('converts amounts between different currency pairs', () => {
    const { convertAmount } = useCurrencyStore.getState()

    // EUR to USD
    expect(convertAmount(100, 'EUR', 'USD')).toBeCloseTo(116.43, 2)
    // EUR to GBP
    expect(convertAmount(100, 'EUR', 'GBP')).toBeCloseTo(85.72, 2)
    // USD to EUR
    expect(convertAmount(116.43, 'USD', 'EUR')).toBeCloseTo(100, 1)
  })

  it('formats native foreign asset prices without base conversion', () => {
    const { formatMoney } = useCurrencyStore.getState()
    // AAPL trading at $150.00 native
    expect(formatMoney(150, 'USD')).toBe('$150.00')
    // UK stock trading at £45.50 native
    expect(formatMoney(45.5, 'GBP')).toBe('£45.50')
  })
})
