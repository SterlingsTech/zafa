import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clientsRaw } = await supabase
    .from('clients')
    .select('*, companies(name), accounts(count)')
    .order('created_at', { ascending: false })
  const clients = (clientsRaw ?? []) as any[]

  return (
    <>
      <Topbar title="Clients" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{clients?.length ?? 0} clients</p>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="h-4 w-4" /> Add Client
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Company</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Accounts</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(clients ?? []).map((c) => (
                <tr key={c.client_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-3 text-gray-500">{(c.companies as any)?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-500">{(c.accounts as any)?.[0]?.count ?? 0}</td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(c.created_at)}</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/dashboard/clients/${c.client_id}`} className="text-amber-600 hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {(clients?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No clients yet. <Link href="/dashboard/clients/new" className="text-amber-600 hover:underline">Add one</Link>.
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
