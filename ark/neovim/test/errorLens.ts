// ErrorLens 3.x's replace step (`diagnosticToInlineMessage` in
// usernamehw/vscode-error-lens src/utils/extUtils.ts), run on V8 as the oracle
// the Lua port is compared against.
export type ErrorLensRule = {
	matcher: string
	message: string
}

export type Rewritten = {
	output: string
	rule: number | null
}

export const rewrite = (
	message: string,
	rules: readonly ErrorLensRule[]
): Rewritten => {
	for (const [index, rule] of rules.entries()) {
		const matchResult = new RegExp(rule.matcher, "iu").exec(message)
		if (!matchResult) continue
		let output = rule.message
		for (let group = 0; group < matchResult.length; group++) {
			// a group that didn't participate is undefined, which replace()
			// stringifies, exactly as ErrorLens's own loop does
			output = output.replace(
				new RegExp(`\\$${group}`, "gu"),
				matchResult[group] as string
			)
		}
		return { output, rule: index }
	}
	return { output: message, rule: null }
}

// ErrorLens's defaults for `prepareMessage`: `removeLinebreaks: true` with
// `replaceLinebreaksSymbol: "⏎"`, then `messageMaxChars: 500`.
export const inline = (message: string): string => {
	const chars = [...message.replace(/[\n\r\t]+/gu, "⏎")]
	return chars.length > 500 ?
			`${chars.slice(0, 500).join("")}…`
		:	chars.join("")
}
