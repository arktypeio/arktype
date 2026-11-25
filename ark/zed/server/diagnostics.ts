/**
 * `errorLens.replace` from `ark/extension/package.json`, verbatim (a test
 * keeps them in sync). In VS Code, ErrorLens shows the result of these at the
 * end of the line in place of the diagnostic's message.
 */
export const errorLensReplace: readonly ErrorLensRule[] = [
	{
		matcher: ".*'ErrorType<\"?(.*?)\"?>'.*$",
		message: "$1"
	},
	{
		matcher: '.*brand": "ErrorType"; (.*) \\}\'\\.$',
		message: "$1"
	},
	{
		matcher: ".*'\"(.*[\\u200A\\u200B])\"'\\.$",
		message: "$1"
	},
	{
		matcher:
			"^(?:Type|Argument of type) '\"(.*)\"' is not assignable to (?:parameter of )?type '(\"\\1.*\")'\\.",
		message: "$2"
	},
	{
		matcher: "[^]*\n([^\n]*)$",
		message: "$1"
	}
]

export type ErrorLensRule = {
	matcher: string
	message: string
}

// ErrorLens 3.30 compiles each matcher with the flags "iu"
// (src/extension.ts, createMessageRegex)
const compiledRules = errorLensReplace.map(rule => ({
	matcher: new RegExp(rule.matcher, "iu"),
	message: rule.message
}))

/**
 * The text ErrorLens shows for a diagnostic message, reproducing
 * `diagnosticToInlineMessage` in ErrorLens 3.30's src/utils/extUtils.ts: the
 * first rule whose matcher matches wins, and each `$N` in its message is
 * replaced in order by group N through a string replacement, so a group's own
 * `$&` or `$$` is expanded and a group that didn't participate reads
 * "undefined", just as it does there.
 */
export const errorLensMessage = (message: string): string => {
	for (const rule of compiledRules) {
		const match = rule.matcher.exec(message)
		if (!match) continue
		let result = rule.message
		for (let i = 0; i < match.length; i++)
			result = result.replace(new RegExp(`\\$${i}`, "gu"), String(match[i]))
		return result
	}
	return message
}

/**
 * What ErrorLens 3.30 draws for a message with its default settings
 * (`errorLens.removeLinebreaks`, `replaceLinebreaksSymbol` and
 * `messageMaxChars`): each run of line breaks and tabs becomes `⏎`, and past
 * 500 code points the message is cut and marked with `…`.
 */
export const errorLensDisplay = (message: string): string => {
	const joined = message.replace(/[\n\r\t]+/gu, "⏎")
	const chars = [...joined]
	return chars.length > 500 ? `${chars.slice(0, 500).join("")}…` : joined
}

/**
 * Zed shows only the first line of a diagnostic's message inline, so what
 * ErrorLens would draw goes first and the original message follows it for
 * hovers and the diagnostics panel.
 */
export const summarizeMessage = (message: string): string => {
	const summary = errorLensDisplay(errorLensMessage(message))
	return summary === message ? message : `${summary}\n${message}`
}

/**
 * The message the language server sent, from one `summarizeMessage` wrote,
 * so code actions match the diagnostics they were computed for.
 */
export const originalMessage = (message: string): string => {
	const lineEnd = message.indexOf("\n")
	if (lineEnd === -1) return message
	const original = message.slice(lineEnd + 1)
	return summarizeMessage(original) === message ? original : message
}

export type LspDiagnostic = {
	message: string | { kind: string; value: string }
	[k: string]: unknown
}

export const summarizeDiagnostic = <diagnostic extends LspDiagnostic>(
	diagnostic: diagnostic
): diagnostic =>
	typeof diagnostic.message === "string" ?
		{ ...diagnostic, message: summarizeMessage(diagnostic.message) }
	:	diagnostic

export const restoreDiagnostic = <diagnostic extends LspDiagnostic>(
	diagnostic: diagnostic
): diagnostic =>
	typeof diagnostic.message === "string" ?
		{ ...diagnostic, message: originalMessage(diagnostic.message) }
	:	diagnostic
