import type { NextConfig } from "next"
import { nodeDevOptions } from "../repo/nodeOptions.js"
import { writeSnippetsEntrypoint } from "./lib/writeSnippetsEntrypoint.ts"

// Next can only treat next.config.ts as CJS, but fumadocs-mdx only supports ESM
// This allows us to import it using Node 22+ with --experimental-require-module
// Should convert to a standard import in the future when this is resolved
// https://github.com/fuma-nama/fumadocs/issues/1054
const { createMDX } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require("./node_modules/fumadocs-mdx/dist/next/index.js") as typeof import("fumadocs-mdx/next")

writeSnippetsEntrypoint()

const config = {
	output: "export",
	reactStrictMode: true,
	cleanDistDir: true,
	env: {
		NODE_OPTIONS: nodeDevOptions
	},
	serverExternalPackages: ["twoslash", "typescript"]
} as const satisfies NextConfig

const mdxConfig = createMDX()(config)

export default mdxConfig
