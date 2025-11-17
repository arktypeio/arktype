import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeLlmsTxt } from "./lib/writeLlmsTxt.ts"
import { updateSnippetsEntrypoint } from "./lib/writeSnippetsEntrypoint.ts"

// workaround for a bug in Node 25 that creates localStorage as an empty proxy,
// leading to @typescript/vfs eventually throwing when it sees that it is not
// undefined and tries to call `getItem`:

// https://github.com/nodejs/node/issues/60303

// this can be removed once the bug is addressed in Node
if (!globalThis.localStorage?.getItem)
	globalThis.localStorage = undefined as never

// also set the --localstorage-file env var so subprocesses don't run into the same issue
process.env.NODE_OPTIONS ??= ""
const tmpDir = mkdtempSync(join(tmpdir(), "ark-localstorage-"))
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} --localstorage-file=${join(tmpDir, "localstorage")}`

updateSnippetsEntrypoint()
writeLlmsTxt()

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
