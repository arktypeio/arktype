import { fromHere, readFile, shell, writeFile } from "@ark/fs"
import { flatMorph, throwInternalError } from "@ark/util"
import { existsSync } from "fs"

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
export const updateSnippetsEntrypoint = () => {
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

	const toPath = snippetPath("contentsById.ts")

	const contents = `export default ${JSON.stringify(snippetContentsById, null, 4)}`

	if (!existsSync(toPath) || readFile(toPath) !== contents) {
		writeFile(toPath, contents)
		shell(`pnpm prettier --write ${toPath}`)
	}
}

const snippetIds = [
	"betterErrors",
	"clarityAndConcision",
	"deepIntrospectability",
	"intrinsicOptimization",
	"unparalleledDx",
	"nestedTypeInScopeError"
] as const

export type SnippetId = (typeof snippetIds)[number]

const snippetPath = (fileName: string) =>
	fromHere("..", "components", "snippets", fileName)
