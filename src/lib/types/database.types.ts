export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          company_id: string
          name: string
          created_at: string
        }
        Insert: {
          company_id?: string
          name: string
          created_at?: string
        }
        Update: {
          company_id?: string
          name?: string
          created_at?: string
        }
      }
      clients: {
        Row: {
          client_id: string
          company_id: string | null
          name: string
          created_at: string
        }
        Insert: {
          client_id?: string
          company_id?: string | null
          name: string
          created_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          name?: string
          created_at?: string
        }
      }
      accounts: {
        Row: {
          account_id: string
          client_id: string
          account_category: 'Salaried' | 'Business' | 'Property' | 'Other'
          business_subtype: 'Goods' | 'Services' | null
          group_title: string | null
          created_at: string
        }
        Insert: {
          account_id?: string
          client_id: string
          account_category: 'Salaried' | 'Business' | 'Property' | 'Other'
          business_subtype?: 'Goods' | 'Services' | null
          group_title?: string | null
          created_at?: string
        }
        Update: {
          account_id?: string
          client_id?: string
          account_category?: 'Salaried' | 'Business' | 'Property' | 'Other'
          business_subtype?: 'Goods' | 'Services' | null
          group_title?: string | null
          created_at?: string
        }
      }
      account_aliases: {
        Row: {
          alias_id: string
          account_id: string
          alias_name: string
        }
        Insert: {
          alias_id?: string
          account_id: string
          alias_name: string
        }
        Update: {
          alias_id?: string
          account_id?: string
          alias_name?: string
        }
      }
      transactions: {
        Row: {
          transaction_id: string
          target_account_id: string
          from_account_id: string | null
          from_company_id: string | null
          title: string
          group_title: string | null
          transaction_date: string
          amount: number
          transaction_type: 'DEBIT' | 'CREDIT'
          purpose: 'Pension' | 'Salary' | 'Bonus' | 'Gratuity' | 'Other'
          created_at: string
        }
        Insert: {
          transaction_id?: string
          target_account_id: string
          from_account_id?: string | null
          from_company_id?: string | null
          title: string
          group_title?: string | null
          transaction_date: string
          amount: number
          transaction_type: 'DEBIT' | 'CREDIT'
          purpose: 'Pension' | 'Salary' | 'Bonus' | 'Gratuity' | 'Other'
          created_at?: string
        }
        Update: {
          transaction_id?: string
          target_account_id?: string
          from_account_id?: string | null
          from_company_id?: string | null
          title?: string
          group_title?: string | null
          transaction_date?: string
          amount?: number
          transaction_type?: 'DEBIT' | 'CREDIT'
          purpose?: 'Pension' | 'Salary' | 'Bonus' | 'Gratuity' | 'Other'
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience row types
export type Company = Database['public']['Tables']['companies']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountAlias = Database['public']['Tables']['account_aliases']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']

export type AccountCategory = Account['account_category']
export type BusinessSubtype = NonNullable<Account['business_subtype']>
export type TransactionType = Transaction['transaction_type']
export type TransactionPurpose = Transaction['purpose']
