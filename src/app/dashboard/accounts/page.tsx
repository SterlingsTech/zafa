import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { Plus } from 'lucide-react'

const categoryColors: Record<string, string> = {
  Salaried: 'bg-blue-100 text-blue-700',
  Business: 'bg-violet-100 text-violet-700',
  Property: 'bg-amber-100 text-amber-700',
  Other: 'bg-gray-100 text-gray-600',
}

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: accountsRaw } = await supabase
    .from('accounts')
    .select('*, clients(name), account_aliases(alias_name)')
    .order('created_at', { ascending: false })
  const accounts = (accountsRaw ?? []) as any[]

  return (
    <>
      <Topbar title="Accounts" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{accounts?.length ?? 0} accounts</p>
          <Link
            href="/dashboard/accounts/new"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="h-4 w-4" /> Add Account
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Client</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Subtype</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Aliases</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(accounts ?? []).map((acc) => (
                <tr key={acc.account_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">
                    {(acc.clients as any)?.name ?? '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[acc.account_category]}`}>
                      {acc.account_category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{acc.business_subtype ?? '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(acc.account_aliases as any[])?.map((a: any) => (
                        <span key={a.alias_name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {a.alias_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/dashboard/accounts/${acc.account_id}`} className="text-amber-600 hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {(accounts?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No accounts yet. <Link href="/dashboard/accounts/new" className="text-amber-600 hover:underline">Add one</Link>.
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
