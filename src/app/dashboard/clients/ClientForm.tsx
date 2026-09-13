'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ClientFormProps {
  companies: { company_id: string; name: string }[]
  defaultValues?: { client_id: string; name: string; company_id: string | null }
}

export default function ClientForm({ companies, defaultValues }: ClientFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCompany = searchParams.get('company_id')

  const [name, setName] = useState(defaultValues?.name ?? '')
  const [companyId, setCompanyId] = useState<string>(
    defaultValues?.company_id ?? presetCompany ?? '',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient() as any
    const payload = { name, company_id: companyId || null }

    if (defaultValues) {
      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('client_id', defaultValues.client_id)
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/dashboard/clients/${defaultValues.client_id}`)
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/dashboard/clients/${data.client_id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="e.g. Usman Ali"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
        >
          <option value="">— None —</option>
          {companies.map((co) => (
            <option key={co.company_id} value={co.company_id}>{co.name}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {loading ? 'Saving…' : defaultValues ? 'Update Client' : 'Create Client'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
