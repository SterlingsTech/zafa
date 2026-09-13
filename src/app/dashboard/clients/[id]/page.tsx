import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import { formatDate } from '@/lib/utils'
import DeleteClientButton from './DeleteClientButton'

export default async function ClientDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: clientRaw } = await supabase
    .from('clients')
    .select('*, companies(name), accounts(*, account_aliases(*))')
    .eq('client_id', id)
    .single()

  if (!clientRaw) notFound()
  const cl = clientRaw as any

  return (
    <>
      <Topbar title={cl.name} breadcrumb="Clients" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cl.name}</h1>
            {cl.companies?.name && (
              <p className="text-sm text-gray-500 mt-0.5">
                Company:{' '}
                <span className="font-medium">{cl.companies.name}</span>
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Created {formatDate(cl.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/clients/${id}/edit`}
              className="text-sm border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition"
            >
              Edit
            </Link>
            <DeleteClientButton id={id} />
          </div>
        </div>

        {/* Accounts */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Accounts ({cl.accounts?.length ?? 0})
            </h2>
            <Link
              href={`/dashboard/accounts/new?client_id=${id}`}
              className="text-sm text-amber-600 hover:underline font-medium"
            >
              + Add Account
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(cl.accounts ?? []).length === 0 && (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No accounts yet.</p>
            )}
            {(cl.accounts ?? []).map((acc: any) => (
              <div key={acc.account_id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{acc.account_category}</span>
                      {acc.business_subtype && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {acc.business_subtype}
                        </span>
                      )}
                      {acc.group_title && (
                        <span className="text-xs text-gray-400">[{acc.group_title}]</span>
                      )}
                    </div>
                    {acc.account_aliases?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {acc.account_aliases.map((alias: any) => (
                          <span key={alias.alias_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {alias.alias_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/accounts/${acc.account_id}`}
                    className="text-xs text-amber-600 hover:underline ml-4"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
