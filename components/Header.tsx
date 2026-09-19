'use client'

import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header className="py-8">
      <nav className="flex items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/" className="whitespace-nowrap text-base font-semibold hover:text-zinc-600 dark:hover:text-zinc-300 sm:text-lg">
            Ian Tracey
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 text-sm sm:gap-6 sm:text-base">
          <Link href="/" className="whitespace-nowrap text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            About
          </Link>
          <Link href="/writing" className="whitespace-nowrap text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Writing
          </Link>
          <Link href="/startups" className="whitespace-nowrap text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Startups
          </Link>
        </div>
      </nav>
    </header>
  )
}
