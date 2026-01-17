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
        <h2 className="text-xl font-medium text-zinc-400">Work</h2>
        <div className="mt-4 space-y-6">
          <div>
            <p className="font-medium">Applied AI, <a href="https://ramp.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Ramp</a></p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Building AI agents to automate financial operations</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">2025 - Present</p>
          </div>
          <div>
            <p className="font-medium">Co-Founder & CTO, <a href="https://turntable.so" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Turntable (YC W23)</a></p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">AI products to automate data pipelines</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">2023 - 2025</p>
          </div>
          <div>
            <p className="font-medium">Tech Lead, <a href="https://stripe.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Stripe</a></p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">ML ranking systems, hosted UI products</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">2021 - 2023</p>
          </div>
          <div>
            <p className="font-medium">Software Engineer, <a href="https://pinterest.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Pinterest</a></p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Growth engineering, 5x&apos;d SMB advertising business</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">2018 - 2021</p>
          </div>
          <div>
            <p className="font-medium">Software Engineer, <a href="https://atlassian.com" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">Atlassian</a></p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Created Atlassian Guard security product</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">2017 - 2018</p>
          </div>
          <div>
            <p className="font-medium">Co-Founder & President, <span className="text-zinc-700 dark:text-zinc-300">Hack Arizona</span></p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">3000+ students, $500k in sponsorships, lots of startups launched</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">2014 - 2017</p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-zinc-400">Investing</h2>
        <div className="mt-4 space-y-4">
          <div>
            <a href="https://www.airhouse.io/" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Airhouse (Acquired by Syncware)</a>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Ecommerce operations and logistics</p>
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
