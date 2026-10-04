export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0e] text-neutral-100">
      {children}
    </div>
  )
}