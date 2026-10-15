export type SyntaxToken = {
	text: string
	kind: "kw" | "sub" | "op" | "num" | "lit" | undefined
}

const tokenPattern =
	/('[^']*'?|"[^"]*"?|\/[^/]*\/?)|(\d+(?:\.\d+)?)|([$A-Z_a-z][\w$]*)|(\.)|([!#%&(),:<=>?[\]|]+)|(\s+)|(.)/g

/**
 * ArkType's in-string grammar, colored like ArkDark: keywords blue,
 * sub-keywords teal, operators copper, literals gold.
 */
export const tokenizeDefinition = (src: string): SyntaxToken[] => {
	const tokens: SyntaxToken[] = []
	let afterDot = false
	for (const [text, literal, num, id, dot, op, space] of src.matchAll(
		tokenPattern
	)) {
		tokens.push({
			text,
			kind:
				literal ? "lit"
				: num ? "num"
				: id ?
					afterDot ? "sub"
					:	"kw"
				: dot || op ? "op"
				: undefined
		})
		if (!space) afterDot = !!dot
	}
	return tokens
}
