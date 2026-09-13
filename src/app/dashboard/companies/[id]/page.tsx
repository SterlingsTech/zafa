import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatDate } from '@/lib/utils'
import DeleteCompanyButton from './DeleteCompanyButton'

export default async function CompanyDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*, clients(*)')
    .eq('company_id', id)
    .single()

  if (!company) notFound()
  const co = company as any

  return (
    <>
      <Topbar title={co.name} breadcrumb="Companies" />
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{co.name}</h1>
            <p className="text-sm text-gray-400 mt-1">Created {formatDate(co.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/companies/${id}/edit`}
              className="text-sm border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition"
            >
              Edit
            </Link>
            <DeleteCompanyButton id={id} />
          </div>
        </div>

        {/* Associated Clients */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Clients ({co.clients?.length ?? 0})</h2>
            <Link
              href={`/dashboard/clients/new?company_id=${id}`}
              className="text-sm text-amber-600 hover:underline font-medium"
            >
              + Add Client
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(co.clients ?? []).length === 0 && (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No clients linked to this company.</p>
            )}
            {(co.clients ?? []).map((client: any) => (
              <div key={client.client_id} className="px-6 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{client.name}</p>
                <Link href={`/dashboard/clients/${client.client_id}`} className="text-xs text-amber-600 hover:underline">
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
