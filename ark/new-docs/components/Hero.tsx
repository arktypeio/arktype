import { PlatformCloud } from "./PlatformCloud";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export const Hero = () => (
  <div className="flex justify-between">
    <div className="absolute top-2 left-0 right-0">
      <div className="flex justify-between">
        <PlatformCloud main="ts" right="vscode" top="neovim" left="intellij" />
        <PlatformCloud main="js" right="chromium" top="node" left="bun" />
      </div>
    </div>
    <div className="relative w-full flex flex-col items-center text-center md:items-start md:text-left">
      <h1 className="mb-4 text-3xl md:text-8xl">Arktype</h1>
      <p className="text-fd-muted-foreground text-lg">
        Typescript&apos;s 1:1 validator, optimized from editor to runtime
      </p>
      <Link
        tabIndex={1}
        href="/docs/intro/setup"
        className="bg-highlight text-black focus-within:outline focus-within:outline-2 outline-white hover:bg-highlight/80 p-5 rounded-full w-fit flex gap-2 my-3 text-sm items-center"
      >
        Set Sail
        <ArrowRightIcon />
      </Link>
    </div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      alt="A serene ark, sailing to runtime"
      src="/image/splash.png"
      className="-mt-16 hidden md:block"
      height={400}
      width={400}
    />
  </div>
);
