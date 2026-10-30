import type { NextConfig } from "next"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeLiveWorker } from "./lib/writeLiveWorker.ts"
import { writeMarkdown } from "./lib/writeMarkdown.ts"
import { writeOgImages } from "./lib/writeOgImages.ts"
import { writePrecompileWorker } from "./lib/writePrecompileWorker.ts"
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

const config: NextConfig = {
	reactStrictMode: true,
	cleanDistDir: true,
	// the repo's AGENTS.md is shared by every agent; don't add Next's own
	agentRules: false,
	// twoslash runs the TypeScript compiler, which shouldn't be bundled
	serverExternalPackages: [
		"typescript",
		"twoslash",
		"@shikijs/twoslash",
		"@typescript/vfs"
	],
	// pages with many twoslash blocks take minutes on a cold cache when the
	// machine is busy; the default 60s fails them
	staticPageGenerationTimeout: 1800,
	// the site is a static export served from GitHub Pages
	output: "export",
	images: {
		unoptimized: true
	}
}

export default async (): Promise<NextConfig> => {
	updateSnippetsEntrypoint()
	writeMarkdown()
	writeLiveWorker()
	await writeOgImages()
	writePrecompileWorker()
	return config
}
