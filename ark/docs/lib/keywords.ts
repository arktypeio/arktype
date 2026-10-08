import { append, entriesOf, flatMorph } from "@ark/util"
import { ark, Generic } from "arktype"
import { arkPrototypes } from "arktype/internal/keywords/constructors.ts"

export const keywordTableNames = [
	"string",
	"number",
	"other",
	"object",
	"array",
	"FormData",
	"TypedArray",
	"instanceof",
	"generic"
] as const

export type KeywordTableName = (typeof keywordTableNames)[number]

export type KeywordRow = {
	alias: string
	description: string
}

export const keywordRowsByTable = flatMorph(keywordTableNames, (i, name) => [
	name,
	[] as KeywordRow[]
])

for (const [alias, v] of entriesOf(ark.internal.resolutions)
	.map(
		([alias, v]) =>
			[alias.endsWith(".root") ? alias.slice(0, -5) : alias, v] as const
	)
	.sort((l, r) => (l[0] < r[0] ? -1 : 1))) {
	// should not occur, only for temporary resolutions of cyclic definition
	if (typeof v === "string") continue

	const name: KeywordTableName =
		alias.startsWith("string") ? "string"
		: alias.startsWith("number") ? "number"
		: alias.startsWith("FormData") ? "FormData"
		: alias.startsWith("Array") ? "array"
		: alias.startsWith("object") ? "object"
		: alias.startsWith("TypedArray") ? "TypedArray"
		: v instanceof Generic ? "generic"
		: alias in arkPrototypes ? "instanceof"
		: "other"

	keywordRowsByTable[name] = append(keywordRowsByTable[name], {
		alias,
		description: v.description
	})
}
