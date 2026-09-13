import { createClient } from '@/lib/supabase/server'
import { ChevronRight } from 'lucide-react'

interface TopbarProps {
  title: string
  breadcrumb?: string
}

export default async function Topbar({ title, breadcrumb }: TopbarProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {breadcrumb && (
          <>
            <span>{breadcrumb}</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      <div className="text-sm text-gray-500">
        {user?.email}
      </div>
    </header>
  )
}
