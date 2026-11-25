/**
 * Writes the queries Zed reads from `languages/arktype` from the shared ones
 * in `ark/tree-sitter`, which a test keeps them in sync with.
 *
 * node ark/zed/writeQueries.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const sharedQueries = join(import.meta.dirname, "..", "tree-sitter", "queries")
const zedQueries = join(import.meta.dirname, "languages", "arktype")

/**
 * Shared captures Zed's themes don't style, as the capture that styles the
 * same thing there. Zed skips a capture its theme has no style for, so the
 * host's `@string` would show in its place.
 */
export const zedCaptures: Record<string, string> = {
	// a character TextMate leaves unscoped takes the editor's foreground,
	// which `primary` is in every theme Zed ships
	none: "primary",
	// the `string` of `string.uuid`, `entity.name.type.module` in TextMate;
	// Zed's themes call it `namespace`
	module: "namespace"
}

export const zedHighlights = (shared: string): string =>
	`; Written by ark/zed/writeQueries.ts from ark/tree-sitter/queries/highlights.scm\n\n${shared.replace(
		/@([._a-z]+)/g,
		(capture, name: string) =>
			name in zedCaptures ? `@${zedCaptures[name]}` : capture
	)}`

export const writtenQueries = (): Record<string, string> => ({
	"highlights.scm": zedHighlights(
		readFileSync(join(sharedQueries, "highlights.scm"), "utf8")
	)
})

if (import.meta.main) {
	for (const [file, query] of Object.entries(writtenQueries()))
		writeFileSync(join(zedQueries, file), query)
}
