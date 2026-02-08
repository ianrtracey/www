'use client'

import { useRef, useState, useCallback } from 'react'
import { Odyssey } from '@odysseyml/odyssey'

type ConnectionStatus =
  | 'disconnected'
  | 'authenticating'
  | 'connecting'
  | 'reconnecting'
  | 'connected'
  | 'failed'

export function WorldViewer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const clientRef = useRef<Odyssey | null>(null)

  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [interactPrompt, setInteractPrompt] = useState('')
  const [isPortrait, setIsPortrait] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_ODYSSEY_API_KEY

  const connect = useCallback(async () => {
    if (!apiKey) {
      setError('API key not configured. Add NEXT_PUBLIC_ODYSSEY_API_KEY to your .env.local file.')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a world.')
      return
    }

    setError(null)

    const client = new Odyssey({ apiKey })
    clientRef.current = client

    await client.connect({
      onConnected: (mediaStream: MediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play()
        }
        setIsStreaming(true)
      },
      onDisconnected: () => {
        setStatus('disconnected')
        setIsStreaming(false)
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
      },
      onStatusChange: (newStatus: ConnectionStatus) => {
        setStatus(newStatus)
      },
      onError: (error: Error, fatal: boolean) => {
        setError(error.message)
        if (fatal) {
          setIsStreaming(false)
        }
      },
      onStreamError: (reason: string, message: string) => {
        setError(`Stream error: ${reason} - ${message}`)
      },
    })

    try {
      await client.startStream({
        prompt: prompt.trim(),
        portrait: isPortrait,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start stream')
    }
  }, [apiKey, prompt, isPortrait])

  const interact = useCallback(async () => {
    if (!clientRef.current || !interactPrompt.trim()) return

    try {
      await clientRef.current.interact({ prompt: interactPrompt.trim() })
      setInteractPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send interaction')
    }
  }, [interactPrompt])

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.endStream()
      clientRef.current = null
    }
    setIsStreaming(false)
    setStatus('disconnected')
  }, [])

  const getStatusColor = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected': return 'text-green-500'
      case 'connecting':
      case 'authenticating':
      case 'reconnecting': return 'text-yellow-500'
      case 'failed': return 'text-red-500'
      default: return 'text-zinc-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Configuration</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${getStatusColor(status)}`}>
              {status}
            </span>
            <div className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500' :
              status === 'failed' ? 'bg-red-500' :
              ['connecting', 'authenticating', 'reconnecting'].includes(status) ? 'bg-yellow-500 animate-pulse' :
              'bg-zinc-400'
            }`} />
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-2">
            World Prompt
          </label>
          <input
            id="prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A serene mountain landscape at sunset..."
            disabled={isStreaming}
            className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPortrait}
              onChange={(e) => setIsPortrait(e.target.checked)}
              disabled={isStreaming}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm">Portrait mode</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isStreaming ? (
            <button
              onClick={connect}
              disabled={!prompt.trim()}
              className="px-4 py-2 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate World
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 rounded-md bg-red-500 text-white font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Stop
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Video Display */}
      <div className={`flex justify-center ${isPortrait ? 'max-w-sm mx-auto' : ''}`}>
        <div className="relative w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full ${isPortrait ? 'aspect-[9/16]' : 'aspect-video'} object-cover`}
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-zinc-400 dark:text-zinc-500 text-sm">
                Enter a prompt and click Generate to start
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interaction Panel */}
      {isStreaming && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Interact</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={interactPrompt}
              onChange={(e) => setInteractPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && interact()}
              placeholder="Pet the cat, zoom in, add rain..."
              className="flex-1 px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={interact}
              disabled={!interactPrompt.trim()}
              className="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
