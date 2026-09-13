import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface SearchParams {
  type?: string
  purpose?: string
  account_id?: string
  from?: string
  to?: string
}

export default async function TransactionsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const rawParams = await props.searchParams
  const searchParams: SearchParams = {
    type: rawParams.type as string | undefined,
    purpose: rawParams.purpose as string | undefined,
    account_id: rawParams.account_id as string | undefined,
    from: rawParams.from as string | undefined,
    to: rawParams.to as string | undefined,
  }
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select(`
      *,
      accounts!target_account_id ( account_category, clients ( name ) )
    `)
    .order('transaction_date', { ascending: false })

  if (searchParams.type) query = query.eq('transaction_type', searchParams.type)
  if (searchParams.purpose) query = query.eq('purpose', searchParams.purpose)
  if (searchParams.account_id) query = query.eq('target_account_id', searchParams.account_id)
  if (searchParams.from) query = query.gte('transaction_date', searchParams.from)
  if (searchParams.to) query = query.lte('transaction_date', searchParams.to)

  const { data: transactionsRaw } = await query
  const transactions = (transactionsRaw ?? []) as any[]

  const totalAmount = transactions.reduce((s, t) => {
    return t.transaction_type === 'CREDIT' ? s + Number(t.amount) : s - Number(t.amount)
  }, 0)

  return (
    <>
      <Topbar title="Transactions" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <form className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              name="type"
              defaultValue={searchParams.type ?? ''}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Types</option>
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Purpose</label>
            <select
              name="purpose"
              defaultValue={searchParams.purpose ?? ''}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Purposes</option>
              {['Pension', 'Salary', 'Bonus', 'Gratuity', 'Other'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              name="from"
              defaultValue={searchParams.from ?? ''}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              name="to"
              defaultValue={searchParams.to ?? ''}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition"
          >
            Filter
          </button>
          <Link href="/dashboard/transactions" className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition">
            Reset
          </Link>
        </form>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {transactions?.length ?? 0} transactions · Net:{' '}
            <span className={`font-semibold ${totalAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(totalAmount))} {totalAmount >= 0 ? 'CR' : 'DR'}
            </span>
          </p>
          <Link
            href="/dashboard/transactions/new"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="h-4 w-4" /> Add Transaction
          </Link>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Client</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Purpose</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(transactions ?? []).map((t) => (
                <tr key={t.transaction_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div>{t.title}</div>
                    {t.group_title && <div className="text-xs text-gray-400">{t.group_title}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{(t.accounts as any)?.clients?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.purpose}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.transaction_type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {t.transaction_type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.transaction_type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.transaction_type === 'CREDIT' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                  </td>
                </tr>
              ))}
              {(transactions?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
