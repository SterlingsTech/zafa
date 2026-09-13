import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'
import StatementAnalyzerClient from './StatementAnalyzerClient'

export const dynamic = 'force-dynamic'

export default async function StatementAnalyzerPage() {
  const supabase = await createClient()

  // Fetch accounts and companies for optional database import feature
  const [accountsRes, companiesRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('account_id, account_category, clients(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('companies')
      .select('company_id, name')
      .order('name', { ascending: true }),
  ])

  const accounts = (accountsRes.data ?? []).map((a: any) => ({
    account_id: a.account_id,
    account_category: a.account_category,
    client_name: a.clients?.name ?? 'Unknown Client',
  }))

  const companies = (companiesRes.data ?? []).map((c: any) => ({
    company_id: c.company_id,
    name: c.name,
  }))

  return (
    <>
      <Topbar title="Statement Analyzer" />
      <div className="p-6">
        <StatementAnalyzerClient accounts={accounts} companies={companies} />
      </div>
    </>
  )
}
