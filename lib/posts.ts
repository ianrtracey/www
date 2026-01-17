import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'content/posts')

export interface PostMeta {
  slug: string
  title: string
  date: string
  description: string
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  const posts = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '')
      const fullPath = path.join(postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      const date = data.date
        ? new Date(data.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : ''

      return {
        slug,
        title: data.title || slug,
        date,
        description: data.description || '',
      }
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1))

  return posts
}

export function getPostBySlug(slug: string): PostMeta | null {
  const fullPath = path.join(postsDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data } = matter(fileContents)

  const date = data.date
    ? new Date(data.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return {
    slug,
    title: data.title || slug,
    date,
    description: data.description || '',
  }
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => fileName.replace(/\.mdx$/, ''))
}
