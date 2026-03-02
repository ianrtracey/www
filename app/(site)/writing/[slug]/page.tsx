import { notFound } from 'next/navigation'
import { getAllPostSlugs, getPostBySlug } from '@/lib/posts'
import type { Metadata } from 'next'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {}
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const { default: Content } = await import(`@/content/posts/${slug}.mdx`)

  return (
    <article className="py-12">
      <header className="mb-8">
        <time className="text-sm text-zinc-400">{post.date}</time>
        <h1 className="mt-2 text-3xl font-semibold">{post.title}</h1>
      </header>
      <div className="prose prose-zinc max-w-none">
        <Content />
      </div>
    </article>
  )
}
