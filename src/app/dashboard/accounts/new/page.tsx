import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import AccountForm from '../AccountForm'

export default async function NewAccountPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('client_id, name')
    .order('name')

  return (
    <>
      <Topbar title="New Account" breadcrumb="Accounts" />
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="font-semibold text-gray-900 mb-6">Add Account</h1>
          <AccountForm clients={clients ?? []} />
        </div>
      </div>
    </>
  )
}
