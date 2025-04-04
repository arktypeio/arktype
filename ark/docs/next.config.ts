import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"
import { updateSnippetsEntrypoint } from "./lib/writeSnippetsEntrypoint.ts"

updateSnippetsEntrypoint()

const config = {
	reactStrictMode: true,
	cleanDistDir: true,
	serverExternalPackages: ["twoslash", "typescript", "ts-morph"],
	// the following properties are required by nextjs-github-pages:
	// https://github.com/gregrickaby/nextjs-github-pages
	output: "export",
	images: {
		unoptimized: true
	}
} as const satisfies NextConfig

const mdxConfig = createMDX()(config)

export default mdxConfig
