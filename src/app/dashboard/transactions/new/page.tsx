import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import TransactionForm from '../TransactionForm'

export default async function NewTransactionPage() {
  const supabase = await createClient()

  const [{ data: accountsRaw }, { data: companies }] = await Promise.all([
    supabase
      .from('accounts')
      .select('account_id, account_category, clients(name)')
      .order('created_at'),
    supabase.from('companies').select('company_id, name').order('name'),
  ])

  const accounts = ((accountsRaw ?? []) as any[]).map((a: any) => ({
    account_id: a.account_id,
    account_category: a.account_category,
    client_name: a.clients?.name ?? 'Unknown',
  }))

  return (
    <>
      <Topbar title="New Transaction" breadcrumb="Transactions" />
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="font-semibold text-gray-900 mb-6">Add Transaction</h1>
          <TransactionForm accounts={accounts} companies={companies ?? []} />
        </div>
      </div>
    </>
  )
}
