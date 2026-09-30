import { create } from 'zustand'

interface PrivacyState {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
  setPrivacyMode: (value: boolean) => void
}

const PRIVACY_KEY = 'wealthos_privacy_mode'

export const usePrivacyStore = create<PrivacyState>((set) => ({
  isPrivacyMode: localStorage.getItem(PRIVACY_KEY) === 'true',
  togglePrivacyMode: () => {
    set((state) => {
      const next = !state.isPrivacyMode
      localStorage.setItem(PRIVACY_KEY, String(next))
      return { isPrivacyMode: next }
    })
  },
  setPrivacyMode: (value: boolean) => {
    localStorage.setItem(PRIVACY_KEY, String(value))
    set({ isPrivacyMode: value })
  },
}))
