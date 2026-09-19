'use client'

import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header className="py-8">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold hover:text-zinc-600 dark:hover:text-zinc-300">
            Ian Tracey
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            About
          </Link>
          <Link href="/writing" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Writing
          </Link>
          <Link href="/startups" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Startups
          </Link>
        </div>
      </nav>
    </header>
  )
}
