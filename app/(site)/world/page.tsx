import type { Metadata } from 'next'
import { WorldViewer } from '@/components/WorldViewer'

export const metadata: Metadata = {
  title: 'World',
  description: 'AI-generated interactive video worlds powered by Odyssey',
}

export default function WorldPage() {
  return (
    <div className="py-12">
      <section>
        <h1 className="text-3xl font-semibold">World</h1>
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">
          Generate interactive video worlds with AI. Enter a prompt to create your scene.
        </p>
      </section>

      <section className="mt-8">
        <WorldViewer />
      </section>
    </div>
  )
}
