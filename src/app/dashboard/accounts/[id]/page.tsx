import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatCurrency, formatDate } from '@/lib/utils'
import DeleteAccountButton from './DeleteAccountButton'
import AliasManager from './AliasManager'
import { AccountAlias } from '@/lib/types/database.types'

export default async function AccountDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const [{ data: accountRaw }, { data: transactions }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, clients(name, client_id), account_aliases(*)')
      .eq('account_id', id)
      .single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('target_account_id', id)
      .order('transaction_date', { ascending: false }),
  ])

  if (!accountRaw) notFound()
  const account = accountRaw as any
  const txns = (transactions ?? []) as any[]

  const totalCredits = txns.filter(t => t.transaction_type === 'CREDIT').reduce((s, t) => s + Number(t.amount), 0)
  const totalDebits = txns.filter(t => t.transaction_type === 'DEBIT').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <>
      <Topbar title={`${account.account_category} Account`} breadcrumb="Accounts" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{account.account_category} Account</h1>
            <p className="text-sm text-gray-500">
              Client:{' '}
              <Link href={`/dashboard/clients/${account.clients?.client_id}`} className="text-amber-600 hover:underline">
                {account.clients?.name}
              </Link>
            </p>
            {account.business_subtype && (
              <p className="text-sm text-gray-500 mt-0.5">Subtype: {account.business_subtype}</p>
            )}
            {account.group_title && (
              <p className="text-sm text-gray-400 mt-0.5">Group: {account.group_title}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/dashboard/accounts/${id}/edit`} className="text-sm border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition">Edit</Link>
            <DeleteAccountButton id={id} />
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Credits</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCredits)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Debits</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebits)}</p>
          </div>
        </div>

        {/* Alias Manager */}
        <AliasManager accountId={id} initialAliases={account.account_aliases as AccountAlias[] ?? []} />

        {/* Transactions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Transactions ({txns.length})</h2>
            <Link href={`/dashboard/transactions?account_id=${id}`} className="text-xs text-amber-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {txns.length === 0 && (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No transactions yet.</p>
            )}
            {txns.slice(0, 10).map((t) => (
              <div key={t.transaction_id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.purpose} · {formatDate(t.transaction_date)}</p>
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
