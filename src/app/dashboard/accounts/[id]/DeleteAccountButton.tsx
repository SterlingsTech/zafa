'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteAccountButton({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this account? All associated transactions will be affected.')) return
    const supabase = createClient()
    await supabase.from('accounts').delete().eq('account_id', id)
    router.push('/dashboard/accounts')
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
