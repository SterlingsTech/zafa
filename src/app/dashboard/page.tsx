import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatCurrency } from '@/lib/utils'
import { Building2, Users, Wallet, ArrowLeftRight } from 'lucide-react'

async function getStats() {
  const supabase = await createClient()

  const [companies, clients, accounts, transactions] = await Promise.all([
    supabase.from('companies').select('company_id', { count: 'exact', head: true }),
    supabase.from('clients').select('client_id', { count: 'exact', head: true }),
    supabase.from('accounts').select('account_id', { count: 'exact', head: true }),
    supabase.from('transactions').select('amount, transaction_type'),
  ])

  const txData = (transactions.data ?? []) as any[]
  const credits = txData
    .filter((t) => t.transaction_type === 'CREDIT')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const debits = txData
    .filter((t) => t.transaction_type === 'DEBIT')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    companies: companies.count ?? 0,
    clients: clients.count ?? 0,
    accounts: accounts.count ?? 0,
    totalTransactions: txData.length,
    credits,
    debits,
  }
}

async function getRecentTransactions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('transactions')
    .select(`
      transaction_id,
      title,
      amount,
      transaction_type,
      purpose,
      transaction_date,
      accounts!target_account_id ( account_category, clients ( name ) )
    `)
    .order('transaction_date', { ascending: false })
    .limit(8)

  return (data ?? []) as any[]
}

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecentTransactions()])

  const cards = [
    { label: 'Companies', value: stats.companies, icon: Building2, color: 'bg-blue-500' },
    { label: 'Clients', value: stats.clients, icon: Users, color: 'bg-emerald-500' },
    { label: 'Accounts', value: stats.accounts, icon: Wallet, color: 'bg-violet-500' },
    { label: 'Transactions', value: stats.totalTransactions, icon: ArrowLeftRight, color: 'bg-amber-500' },
  ]

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className={`${color} p-3 rounded-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credit / Debit summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Total Credits</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.credits)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500 mb-1">Total Debits</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.debits)}</p>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recent.length === 0 && (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No transactions yet.</p>
            )}
            {recent.map((t: any) => (
              <div key={t.transaction_id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-500">
                    {t.accounts?.clients?.name} · {t.purpose} · {t.transaction_date}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${t.transaction_type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
