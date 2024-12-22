/* eslint-disable @typescript-eslint/no-require-imports */
import type { NextConfig } from "next"
import { writeSnippetsEntrypoint } from "./lib/writeSnippetsEntrypoint.ts"

// Next can only treat next.config.ts as CJS, but fumadocs-mdx only supports ESM
// This allows us to import it using Node 22+ with --experimental-require-module
// Should convert to a standard import in the future when this is resolved
// https://github.com/fuma-nama/fumadocs/issues/1054
const { createMDX } =
	require("./node_modules/fumadocs-mdx/dist/next/index.js") as typeof import("fumadocs-mdx/next")

writeSnippetsEntrypoint()

const config = {
	reactStrictMode: true,
	cleanDistDir: true,
	serverExternalPackages: ["twoslash", "typescript"],
	// the following properties are required by nextjs-github-pages:
	// https://github.com/gregrickaby/nextjs-github-pages
	output: "export",
	basePath:
		process.env.NODE_ENV === "development" ? (undefined as never) : "/arktype",
	images: {
		unoptimized: true
	}
} as const satisfies NextConfig

const mdxConfig = createMDX()(config)

export default mdxConfig
