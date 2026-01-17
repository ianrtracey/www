import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'

export default function Home() {
  const recentPosts = getAllPosts().slice(0, 3)

  return (
    <div className="py-12">
      <section>
        <h1 className="text-3xl font-semibold">Hey, I&apos;m Ian</h1>
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">
          I work on Applied AI at <a href="https://ramp.com/" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Ramp</a> in NYC. I write and invest sometimes.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-zinc-400">Currently</h2>
        <div className="mt-4 space-y-3">
          <p>
            Investor in Airhouse, Density, Headgum & more
          </p>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-zinc-400">Previously</h2>
        <div className="mt-4 space-y-3">
          <p>
            Co-Founder & CTO at{' '}
            <a
              href="https://turntable.so"
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Turntable (YC W23)
            </a>
          </p>
          <p>
            Engineering at{' '}
            <a href="https://stripe.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Stripe</a>,{' '}
            <a href="https://pinterest.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Pinterest</a>,{' '}
            <a href="https://atlassian.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Atlassian</a>
          </p>
          <p>
            Co-Founder & President at{' '}
            <span className="text-zinc-700 dark:text-zinc-300">Hack Arizona</span>
          </p>
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
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {post.description}
                  </p>
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
