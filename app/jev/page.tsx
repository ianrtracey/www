import type { Metadata } from 'next'
import Image from 'next/image'
import { jevDemos, type JevDemo } from '@/lib/jev-gallery'

export const metadata: Metadata = {
  title: 'Jev Gallery',
  description: 'A gallery of TypeSafe Jev demos — structured outputs at the speed of thought.',
}

function DemoCard({ demo }: { demo: JevDemo }) {
  const isGif = demo.image.endsWith('.gif')

  return (
    <div className="group">
      <a
        href={demo.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg dark:hover:shadow-zinc-900/50"
      >
        <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <Image
            src={demo.image}
            alt={demo.title}
            fill
            unoptimized={isGif}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      </a>
      <div className="mt-3">
        <a
          href={demo.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {demo.title}
        </a>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {demo.description}
        </p>
        {demo.links && demo.links.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {demo.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              >
                {link.label} &rarr;
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function JevGalleryPage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold">Jev Gallery</h1>
      <p className="mt-4 text-zinc-500 dark:text-zinc-400">
        Demos built with{' '}
        <a
          href="https://typesafe.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          TypeSafe Jev
        </a>
        {' '}— structured outputs at the speed of thought.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
        {jevDemos.map((demo) => (
          <DemoCard key={demo.id} demo={demo} />
        ))}
      </div>
    </div>
  )
}
