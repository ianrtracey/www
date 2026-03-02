import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Thoughts on building software, startups, and more.',
}

export default function WritingPage() {
  const posts = getAllPosts()

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold">Writing</h1>

      <div className="mt-8 space-y-8">
        {posts.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <article key={post.slug}>
              <Link href={`/writing/${post.slug}`} className="group block">
                <time className="text-sm text-zinc-400">{post.date}</time>
                <h2 className="text-lg font-medium group-hover:text-blue-500 dark:group-hover:text-blue-400">
                  {post.title}
                </h2>
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
