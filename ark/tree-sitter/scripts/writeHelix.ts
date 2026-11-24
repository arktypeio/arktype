// Writes helix/runtime/queries from the editor-neutral queries: Helix names
// numbers `constant.numeric` and modules `namespace`, has no `none`, and adds
// injections to a language by overriding its injections.scm, so each host
// inherits the ArkType patterns from `_arktype` alongside its own.
//
//   node ark/tree-sitter/scripts/writeHelix.ts           write
//   node ark/tree-sitter/scripts/writeHelix.ts --check   fail if stale
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

const root = new URL("../", import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), "utf8")

const helixCaptures: Record<string, string | null> = {
	number: "constant.numeric",
	module: "namespace",
	none: null
}

const header = (source: string) =>
	`; Generated from ${source} by scripts/writeHelix.ts; edit that instead.\n\n`

const highlights = () => {
	const blocks = read("queries/highlights.scm").split(/\n(?=\n)/)
	return (
		header("queries/highlights.scm") +
		blocks
			.filter(block => {
				const capture = block.match(/@([\w.]+)\s*$/)?.[1]
				return !(capture && helixCaptures[capture] === null)
			})
			.map(block =>
				block.replace(/@([\w.]+)/g, (whole, capture: string) =>
					helixCaptures[capture] ? `@${helixCaptures[capture]}` : whole
				)
			)
			.join("\n")
			.trim() +
		"\n"
	)
}

// Helix's own injections.scm for each host, plus `_arktype`
const hostInherits: Record<string, string> = {
	typescript: "_typescript,ecma",
	tsx: "_jsx,_typescript,ecma",
	javascript: "_javascript,ecma",
	jsx: "_jsx,_javascript,ecma"
}

export const helixOutputs = (): Map<string, string> =>
	new Map<string, string>([
		["helix/runtime/queries/arktype/highlights.scm", highlights()],
		[
			"helix/runtime/queries/_arktype/injections.scm",
			header("queries/ecma/injections.scm") +
				read("queries/ecma/injections.scm")
		],
		...Object.entries(hostInherits).map(
			([host, inherits]) =>
				[
					`helix/runtime/queries/${host}/injections.scm`,
					`; Helix's own ${host} injections, and ArkType's.\n\n; inherits: _arktype,${inherits}\n`
				] as [string, string]
		)
	])

export const staleHelixFiles = (): string[] =>
	[...helixOutputs()]
		.filter(([path, contents]) => {
			try {
				return read(path) !== contents
			} catch {
				return true
			}
		})
		.map(([path]) => path)

if (import.meta.main) {
	if (process.argv.includes("--check")) {
		const stale = staleHelixFiles()
		if (stale.length) {
			console.error(`stale: ${stale.join(", ")}`)
			process.exit(1)
		}
	} else {
		for (const [path, contents] of helixOutputs()) {
			const url = new URL(path, root)
			mkdirSync(new URL("./", url), { recursive: true })
			writeFileSync(url, contents)
		}
		console.log("wrote helix/runtime/queries")
	}
}
