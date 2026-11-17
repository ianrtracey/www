import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3)

  return (
    <div className="py-12">
      <section>
        <h1 className="text-3xl font-semibold">Hey, I&apos;m Ian</h1>
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">
          I work at <a href="https://www.anthropic.com/" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Anthropic</a> in NYC. I write and invest sometimes.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-zinc-400">Investing</h2>
        <div className="mt-4 space-y-4">
          <div>
            <a href="https://www.airhouse.io/" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Airhouse (Acquired by Syncware)</a>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">E-commerce operations and logistics</p>
          </div>
          <div>
            <a href="https://density.io/" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Density</a>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Sensors to measure space, not people</p>
          </div>
          <div>
            <a href="https://headgum.com/" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Headgum</a>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Rethinking podcast networks</p>
          </div>
        </div>
      </section>

      {recentPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-medium text-zinc-400">Recent Writing</h2>
          <div className="mt-4 space-y-4">
            {recentPosts.map((post) => (
              <article key={post.slug}>
                <Link
                  href={`/writing/${post.slug}`}
                  className="group block"
                >
                  <h3 className="font-medium group-hover:text-blue-500 dark:group-hover:text-blue-400">
                    {post.title}
                  </h3>
                </Link>
              </article>
            ))}
          </div>
          <Link
            href="/writing"
            className="mt-6 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View all posts &rarr;
          </Link>
        </section>
      )}
    </div>
  )
}
