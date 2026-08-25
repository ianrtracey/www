'use client'

import { useState } from 'react'

interface CopyablePromptProps {
  content: string
}

export function CopyablePrompt({ content }: CopyablePromptProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-8">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleCopy}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
        <code className="text-zinc-800 dark:text-zinc-200">{content}</code>
      </pre>
    </div>
  )
}
