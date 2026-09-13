import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import ClientForm from '../ClientForm'

export default async function NewClientPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from('companies')
    .select('company_id, name')
    .order('name')

  return (
    <>
      <Topbar title="New Client" breadcrumb="Clients" />
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="font-semibold text-gray-900 mb-6">Add Client</h1>
          <ClientForm companies={companies ?? []} />
        </div>
      </div>
    </>
  )
}
