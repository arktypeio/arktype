import { fromHere, readFile, writeFile } from "@ark/fs"
import { flatMorph, throwInternalError } from "@ark/util"
import { existsSync } from "fs"
import type { NextConfig } from "next"

// Next can only treat next.config.ts as CJS, but fumadocs-mdx only supports ESM
// This allows us to import it using Node 22+ with --experimental-require-module
// Should convert to a standard import in the future when this is resolved
// https://github.com/fuma-nama/fumadocs/issues/1054
const { createMDX } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	require("./node_modules/fumadocs-mdx/dist/next/index.js") as typeof import("fumadocs-mdx/next")

const snippetIds = [
	"betterErrors",
	"clarityAndConcision",
	"deepIntrospectability",
	"intrinsicOptimization",
	"unparalleledDx"
] as const

export type SnippetId = (typeof snippetIds)[number]

const snippetPath = (fileName: string) =>
	fromHere("components", "snippets", fileName)

/**
 * Previously, we used raw-loader imports like:
 *
 * import unparalleledDx from "./snippets/unparalleledDx.twoslash.js?raw"
 *
 * so that we could write longer code blocks for use in .tsx
 * without losing syntax highlighting, type checking etc.
 * However, I was unable to get this working with Next's --turbo
 * flag, which seems very impactful in terms of performance.
 *
 * As a workaround, when this config is loaded, we regenerate
 * the contents.ts file and just import that directly. It is
 * then committed to git as normal.
 */

const snippetContentsById = flatMorph(snippetIds, (i, id) => {
	const tsPath = snippetPath(`${id}.twoslash.ts`)
	const jsPath = snippetPath(`${id}.twoslash.js`)

	const path =
		existsSync(tsPath) ? tsPath
		: existsSync(jsPath) ? jsPath
		: throwInternalError(
				`Expected a snippet file at ${tsPath} or ${jsPath} (neither existed).`
			)
	return [id, readFile(path)]
})

writeFile(
	snippetPath("contentsById.ts"),
	`export default ${JSON.stringify(snippetContentsById, null, 4)}`
)

const config = {
	output: "export",
	reactStrictMode: true,
	cleanDistDir: true,
	serverExternalPackages: ["twoslash", "typescript"]
} as const satisfies NextConfig

const mdxConfig = createMDX()(config)

export default mdxConfig
