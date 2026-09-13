'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TransactionType, TransactionPurpose } from '@/lib/types/database.types'

interface TransactionFormProps {
  accounts: { account_id: string; account_category: string; client_name: string }[]
  companies: { company_id: string; name: string }[]
}

const PURPOSES: TransactionPurpose[] = ['Pension', 'Salary', 'Bonus', 'Gratuity', 'Other']

export default function TransactionForm({ accounts, companies }: TransactionFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [targetAccountId, setTargetAccountId] = useState(searchParams.get('account_id') ?? '')
  const [fromAccountId, setFromAccountId] = useState('')
  const [fromCompanyId, setFromCompanyId] = useState('')
  const [title, setTitle] = useState('')
  const [groupTitle, setGroupTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('CREDIT')
  const [purpose, setPurpose] = useState<TransactionPurpose>('Salary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient() as any

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        target_account_id: targetAccountId,
        from_account_id: fromAccountId || null,
        from_company_id: fromCompanyId || null,
        title,
        group_title: groupTitle || null,
        transaction_date: date,
        amount: parseFloat(amount),
        transaction_type: type,
        purpose,
      })
      .select()
      .single()

    if (error) { setError(error.message); setLoading(false); return }
    router.push(`/dashboard/accounts/${data.target_account_id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Account *</label>
          <select
            required
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— Select account —</option>
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.client_name} — {a.account_category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="e.g. July Salary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Title</label>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="e.g. BT"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="CREDIT">CREDIT</option>
            <option value="DEBIT">DEBIT</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as TransactionPurpose)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Account (same client transfer)</label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— None —</option>
            {accounts.filter(a => a.account_id !== targetAccountId).map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.client_name} — {a.account_category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Company (external source)</label>
          <select
            value={fromCompanyId}
            onChange={(e) => setFromCompanyId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">— None —</option>
            {companies.map((co) => (
              <option key={co.company_id} value={co.company_id}>{co.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {loading ? 'Saving…' : 'Create Transaction'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-gray-300 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  )
}
