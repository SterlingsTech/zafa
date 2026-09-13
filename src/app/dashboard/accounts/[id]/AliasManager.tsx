'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AccountAlias } from '@/lib/types/database.types'
import { Trash2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  accountId: string
  initialAliases: AccountAlias[]
}

export default function AliasManager({ accountId, initialAliases }: Props) {
  const router = useRouter()
  const [aliases, setAliases] = useState<AccountAlias[]>(initialAliases)
  const [newAlias, setNewAlias] = useState('')
  const [loading, setLoading] = useState(false)

  async function addAlias() {
    if (!newAlias.trim()) return
    setLoading(true)
    const supabase = createClient() as any
    const { data, error } = await supabase
      .from('account_aliases')
      .insert({ account_id: accountId, alias_name: newAlias.trim() })
      .select()
      .single()

    if (!error && data) {
      setAliases((prev) => [...prev, data])
      setNewAlias('')
      router.refresh()
    }
    setLoading(false)
  }

  async function removeAlias(aliasId: string) {
    const supabase = createClient() as any
    await supabase.from('account_aliases').delete().eq('alias_id', aliasId)
    setAliases((prev) => prev.filter((a) => a.alias_id !== aliasId))
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Account Aliases</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {aliases.map((alias) => (
          <span key={alias.alias_id} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
            {alias.alias_name}
            <button onClick={() => removeAlias(alias.alias_id)} className="text-gray-400 hover:text-red-500 transition">
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
        {aliases.length === 0 && <p className="text-sm text-gray-400">No aliases yet.</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newAlias}
          onChange={(e) => setNewAlias(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addAlias()}
          placeholder="e.g. BoliTech"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={addAlias}
          disabled={loading || !newAlias.trim()}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  )
}
