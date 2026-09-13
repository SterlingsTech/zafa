'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CompanyFormProps {
  defaultValues?: { company_id: string; name: string }
}

export default function CompanyForm({ defaultValues }: CompanyFormProps) {
  const router = useRouter()
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient() as any

    if (defaultValues) {
      const { error } = await supabase
        .from('companies')
        .update({ name })
        .eq('company_id', defaultValues.company_id)
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/dashboard/companies/${defaultValues.company_id}`)
    } else {
      const { data, error } = await supabase
        .from('companies')
        .insert({ name })
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/dashboard/companies/${data.company_id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="e.g. BolaTech Pvt Ltd"
        />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {loading ? 'Saving…' : defaultValues ? 'Update Company' : 'Create Company'}
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
