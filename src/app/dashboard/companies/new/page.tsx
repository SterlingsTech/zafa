import CompanyForm from '../CompanyForm'
import Topbar from '@/components/layout/Topbar'

export default function NewCompanyPage() {
  return (
    <>
      <Topbar title="New Company" breadcrumb="Companies" />
      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="font-semibold text-gray-900 mb-6">Add Company</h1>
          <CompanyForm />
        </div>
      </div>
    </>
  )
}
