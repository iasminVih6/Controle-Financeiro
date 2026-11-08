export interface Person {
  id: string
  name: string
  phone: string | null
  cpf: string | null
  notes: string | null
  created_at: string
}
export interface Loan {
  id: string
  person_id: string
  principal: number
  interest_rate: number
  interest_amount: number
  total_amount: number
  loan_date: string
  due_date: string
  notes: string | null
  created_at: string
}
export interface Payment {
  id: string
  loan_id: string
  amount: number
  paid_at: string
  notes: string | null
  created_at: string
}
