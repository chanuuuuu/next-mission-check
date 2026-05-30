import { Toaster } from 'sonner'
import RegistrationNav from '@/components/inquery/registration-nav'

export default function InquiryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted">
      <RegistrationNav />
      {children}
      <Toaster richColors position="top-center" />
    </div>
  )
}
