export interface JevDemo {
  id: string
  title: string
  description: string
  href: string
  image: string
  links?: { label: string; href: string }[]
}

export const jevDemos: JevDemo[] = [
  {
    id: 'semanticspace',
    title: 'SemanticSpace',
    description: 'Invent axes; Jev places phrases.',
    href: 'https://semanticspace.dev/',
    image: '/jev-gallery/01-semanticspace.png',
  },
  {
    id: 'jev-ultrafast',
    title: 'Jev Ultrafast',
    description: 'Browser Use flights ~7s / ~$0.0039.',
    href: 'https://github.com/browser-use/jev-ultrafast',
    image: '/jev-gallery/browser-use-demo.gif',
    links: [
      { label: 'Tweet', href: 'https://x.com/gregpr07/status/2100411066966749359' },
    ],
  },
  {
    id: 'typewriter',
    title: 'Typewriter',
    description: 'Live judgments as you type.',
    href: 'https://typesafe-demo.val.run/',
    image: '/jev-gallery/02-typewriter.png',
  },
  {
    id: 'crowdcheck',
    title: 'Crowdcheck',
    description: '~10k synthetic personas.',
    href: 'https://crowdcheck-ai.vercel.app/',
    image: '/jev-gallery/03-crowdcheck.png',
  },
  {
    id: 'music-lab',
    title: 'Music Lab',
    description: 'Jev picks enums; code renders music.',
    href: 'https://jev-playground.vercel.app/music/',
    image: '/jev-gallery/05-music.png',
  },
  {
    id: 'jev-search',
    title: 'Jev Search',
    description: 'Typed search judgments.',
    href: 'https://jev.s1.dev/',
    image: '/jev-gallery/04-jev-search.png',
  },
  {
    id: 'jev-trader',
    title: 'jev-trader',
    description: 'Buy/sell every Monad block.',
    href: 'https://jev-trader.vercel.app/',
    image: '/jev-gallery/08-trader.png',
  },
  {
    id: 'smart-home',
    title: 'Smart-home Fan-out',
    description: 'Official pattern demo.',
    href: 'https://docs.typesafe.ai/demos/smart-home',
    image: '/jev-gallery/07-smart-home.png',
  },
  {
    id: 'doom-wikiracing',
    title: 'Doom + Wikiracing',
    description: 'Launch demos.',
    href: 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
    image: '/jev-gallery/13-typesafe-blog.png',
  },
  {
    id: 'jevplayground',
    title: 'No-signup Playground',
    description: 'Try Jev instantly.',
    href: 'https://jevplayground.com/',
    image: '/jev-gallery/06-jevplayground.png',
  },
  {
    id: 'jev-chess',
    title: 'Jev Chess',
    description: 'AI chess with typed moves.',
    href: 'https://jev-chess-master.vercel.app/',
    image: '/jev-gallery/07-smart-home.png',
  },
  {
    id: 'pitch-jev',
    title: 'Pitch Jev',
    description: 'Practice your pitch with Jev.',
    href: 'https://pitchjev.vercel.app/',
    image: '/jev-gallery/06-jevplayground.png',
  },
]
