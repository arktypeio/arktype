import type { NextConfig } from "next"

// Next can only treat next.config.ts as CJS, but fumadocs-mdx only supports ESM
// This allows us to import it using Node 22+ with --experimental-require-module
// Should convert to a standard import in the future when this is resolved
// https://github.com/fuma-nama/fumadocs/issues/1054
const { createMDX } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require("./node_modules/fumadocs-mdx/dist/next/index.js") as typeof import("fumadocs-mdx/next")

const config = {
	output: "export",
	reactStrictMode: true,
	serverExternalPackages: ["twoslash", "typescript"],
	webpack: config => {
		// this must be added to the beginning of the array
		// so that imports like the following don't have types stripped:

		// import betterErrors from "!./snippets/betterErrors.twoslash.ts?raw"
		config.module.rules.push({
			resourceQuery: /raw/,
			type: "asset/source"
		})

		return config
	}
} as const satisfies NextConfig

const mdxConfig = createMDX()(config)

export default mdxConfig
