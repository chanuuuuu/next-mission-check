import { Toaster } from 'sonner'

export default function InquiryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted">
      {children}
      <Toaster richColors position="top-center" />
    </div>
  )
}
