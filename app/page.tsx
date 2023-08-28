import Image from "next/image";

const Link = ({ color, children, href, overrides }: any) => (
  <a
    href={href}
    className={`font-medium text-blue-400 hover:text-blue-500 cursor-pointer`}
  >
    {children}
  </a>
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 pt-24">
      <div>
        <div className="text-3xl font-semibold">Hey, I&apos;m Ian</div>
        <div className='text-md  py-2 text-zinc-400'>I&apos;m building AI-powered data tools in New York City. I write and invest sometimes.</div>


        <div className="mt-12 space-y-2 text-md">
          <div className="text-2xl text-zinc-400">Currently</div>
          <div>
            Co-founder at{" "}
            <Link color="text-sky-500" href="https://turntable.so" overrides={"font-normal"}>
              Turntable (YC W23)
            </Link>
          </div>
          <div>
            Investor in{" "}
            <Link color="text-sky-500" overrides={"font-normal"}>
              Airhouse, Density, Headgum & more
            </Link>
          </div>
        </div>
        <div className="mt-12 space-y-2 ">
          <div className="text-2xl text-zinc-400">Previously</div>
          <div>
            Engineering at <Link color="text-sky-500" overrides={"font-normal"}>Stripe</Link>,{" "}
            <Link color="text-sky-500" overrides={"font-normal"}>Pinterest</Link>,{" "}
            <Link color="text-sky-500" overrides={"font-normal"}>Atlassian</Link>
          </div>
          <div>
            Co-founder at <Link color="text-sky-500" overrides={"font-normal"}>Hack Arizona</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
