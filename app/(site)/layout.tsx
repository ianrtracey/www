import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-6 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
