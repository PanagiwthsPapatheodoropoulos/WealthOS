export type AccountType = 'CASH' | 'INVESTMENT'

export interface Account {
  id: string
  name: string
  accountType: AccountType
  currency: string
  cashBalance: number
  createdAt: string
}