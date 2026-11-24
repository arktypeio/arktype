// The VS Code extension's inline errors, reproduced: ErrorLens (v3.30.0,
// usernamehw/vscode-error-lens@43632f7) applying the `errorLens.replace`
// rules the extension sets in ark/extension/package.json.
import { readFileSync } from "node:fs"

export type ReplaceRule = {
	matcher: string
	message: string
}

const manifest = JSON.parse(
	readFileSync(new URL("../../extension/package.json", import.meta.url), "utf8")
)

/** The extension's `errorLens.replace` default, in order. */
export const replaceRules: ReplaceRule[] =
	manifest.contributes.configurationDefaults["errorLens.replace"]

export type Rewrite = {
	message: string
	/** index of the rule that matched, or null if the message passed through */
	rule: number | null
}

/**
 * ErrorLens's `diagnosticToInlineMessage`: the first rule whose matcher,
 * compiled with the `iu` flags, matches anywhere in the message replaces it
 * with the rule's `message`, where each `$N` becomes group N. The groups are
 * substituted one at a time with `String.prototype.replace`, so `$&`, `$$`,
 * `` $` `` and `$'` inside a group's text are themselves expanded, and a
 * group that didn't participate becomes the text "undefined".
 */
export const rewrite = (
	message: string,
	rules: ReplaceRule[] = replaceRules
): Rewrite => {
	for (const [i, rule] of rules.entries()) {
		const match = new RegExp(rule.matcher, "iu").exec(message)
		if (!match) continue
		let result = rule.message
		for (let group = 0; group < match.length; group++) {
			result = result.replace(
				new RegExp(`\\$${group}`, "gu"),
				match[group] as never
			)
		}
		return { message: result, rule: i }
	}
	return { message, rule: null }
}

/** ErrorLens's defaults for what it draws after the line. */
export const displayDefaults = {
	messageTemplate: "$message",
	removeLinebreaks: true,
	replaceLinebreaksSymbol: "⏎",
	messageMaxChars: 500
}

/**
 * What ErrorLens draws for a rewritten message with its default settings:
 * runs of `\n`, `\r` and `\t` become `⏎`, then anything past 500 code points
 * is cut and marked with `…`.
 */
export const display = (rewritten: string): string => {
	const joined = rewritten.replace(
		/[\n\r\t]+/gu,
		displayDefaults.replaceLinebreaksSymbol
	)
	const chars = [...joined]
	return chars.length > displayDefaults.messageMaxChars ?
			`${chars.slice(0, displayDefaults.messageMaxChars).join("")}…`
		:	joined
}
