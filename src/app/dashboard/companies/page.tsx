import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: companiesRaw } = await supabase
    .from('companies')
    .select('*, clients(count)')
    .order('created_at', { ascending: false })
  const companies = (companiesRaw ?? []) as any[]

  return (
    <>
      <Topbar title="Companies" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{companies?.length ?? 0} companies</p>
          <Link
            href="/dashboard/companies/new"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus className="h-4 w-4" /> Add Company
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Clients</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(companies ?? []).map((co) => (
                <tr key={co.company_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{co.name}</td>
                  <td className="px-6 py-3 text-gray-500">{(co.clients as any)?.[0]?.count ?? 0}</td>
                  <td className="px-6 py-3 text-gray-400">{formatDate(co.created_at)}</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/dashboard/companies/${co.company_id}`} className="text-amber-600 hover:underline text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {(companies?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    No companies yet. <Link href="/dashboard/companies/new" className="text-amber-600 hover:underline">Add one</Link>.
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
