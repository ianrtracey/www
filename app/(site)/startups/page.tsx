import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Startups',
  description: 'Resources for finding and evaluating startups to join.',
}

const resources = [
  {
    name: 'Notice',
    url: 'https://notice.co',
    description: 'Discover high-growth startups hiring now',
  },
  {
    name: 'Buildlist',
    url: 'https://www.buildlist.xyz',
    description: 'Curated list of startups worth joining',
  },
  {
    name: 'TrueUp',
    url: 'https://www.trueup.io',
    description: 'Tech job search with salary and funding data',
  },
  {
    name: 'Harmonic Hot 25',
    url: 'https://www.harmonic.ai/hot-25-companies/q1-2026',
    description: 'Quarterly ranking of the hottest emerging startups',
  },
]

export default function StartupsPage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold">Startups</h1>
      <p className="mt-4 text-zinc-500 dark:text-zinc-400">
        Resources for finding and evaluating startups to join.
      </p>

      <div className="mt-8 space-y-6">
        {resources.map((resource) => (
          <div key={resource.url}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {resource.name}
            </a>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {resource.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
