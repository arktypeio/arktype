import { readFileSync } from "node:fs"

type CategoryRule = { prefix: string; category: string }

const { rules } = JSON.parse(
	readFileSync(new URL("./categories.json", import.meta.url), "utf8")
) as { rules: CategoryRule[] }

const matches = (scope: string, prefix: string) =>
	scope === prefix || scope.startsWith(`${prefix}.`)

/** The category of a TextMate scope stack (root first), per categories.json. */
export const categorize = (scopes: readonly string[]): string => {
	for (let i = scopes.length - 1; i >= 0; i--) {
		for (const rule of rules)
			if (matches(scopes[i], rule.prefix)) return rule.category
	}
	return "none"
}

const isStringOrComment = (scope: string) =>
	matches(scope, "string") ||
	matches(scope, "comment") ||
	matches(scope, "punctuation.definition.string") ||
	matches(scope, "punctuation.definition.comment")

const isCode = (scope: string) =>
	scope.startsWith("source.") ||
	matches(scope, "meta.template.expression") ||
	matches(scope, "meta.embedded")

/**
 * Whether the host grammar alone puts a character in a string or comment:
 * the innermost string, comment or embedded-code scope decides, so code in a
 * template substitution or an embedded block is not string text.
 */
export const isStringOrCommentText = (scopes: readonly string[]): boolean => {
	for (let i = scopes.length - 1; i >= 0; i--) {
		if (isStringOrComment(scopes[i])) return true
		if (isCode(scopes[i])) return false
	}
	return false
}
