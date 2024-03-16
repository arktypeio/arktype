export const extractionTokens = {
	"@snipStart": "@snipStart",
	"@snipEnd": "@snipEnd",
	"@snipLine": "@snipLine",
	"@snipStatement": "@snipStatement"
} as const

export type ExtractionToken = keyof typeof extractionTokens

export const referenceTokens = {
	"@blockFrom": "@blockFrom",
	"@blockEnd": "@blockEnd",
	"@lineFrom": "@lineFrom"
} as const

export type ReferenceToken = keyof typeof referenceTokens

export const snipTokens = {
	...extractionTokens,
	...referenceTokens
}

export const includesTokenFrom = (
	s: string,
	tokens: Record<string, string>
): boolean => Object.keys(tokens).some((token) => s.includes(token))
