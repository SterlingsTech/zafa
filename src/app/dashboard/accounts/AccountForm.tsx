'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AccountCategory, BusinessSubtype } from '@/lib/types/database.types'

interface AccountFormProps {
  clients: { client_id: string; name: string }[]
  defaultValues?: {
    account_id: string
    client_id: string
    account_category: AccountCategory
    business_subtype: BusinessSubtype | null
    group_title: string | null
  }
}

const CATEGORIES: AccountCategory[] = ['Salaried', 'Business', 'Property', 'Other']
const SUBTYPES: BusinessSubtype[] = ['Goods', 'Services']

export default function AccountForm({ clients, defaultValues }: AccountFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetClient = searchParams.get('client_id')

  const [clientId, setClientId] = useState(defaultValues?.client_id ?? presetClient ?? '')
  const [category, setCategory] = useState<AccountCategory>(defaultValues?.account_category ?? 'Salaried')
  const [subtype, setSubtype] = useState<string>(defaultValues?.business_subtype ?? '')
  const [groupTitle, setGroupTitle] = useState(defaultValues?.group_title ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient() as any

    const payload = {
      client_id: clientId,
      account_category: category,
      business_subtype: category === 'Business' ? (subtype as BusinessSubtype) || null : null,
      group_title: groupTitle || null,
    }

    if (defaultValues) {
      const { error } = await supabase
        .from('accounts')
        .update(payload)
        .eq('account_id', defaultValues.account_id)
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/dashboard/accounts/${defaultValues.account_id}`)
    } else {
      const { data, error } = await supabase
        .from('accounts')
        .insert(payload)
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/dashboard/accounts/${data.account_id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
        <select
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">— Select client —</option>
          {clients.map((c) => (
            <option key={c.client_id} value={c.client_id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AccountCategory)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {category === 'Business' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Subtype</label>
          <select
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— Select subtype —</option>
            {SUBTYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Group Title (optional)</label>
        <input
          type="text"
          value={groupTitle}
          onChange={(e) => setGroupTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="e.g. BT"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {loading ? 'Saving…' : defaultValues ? 'Update Account' : 'Create Account'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-gray-300 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  )
}
