'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteCompanyButton({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this company? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('companies').delete().eq('company_id', id)
    router.push('/dashboard/companies')
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition"
    >
      Delete
    </button>
  )
}
