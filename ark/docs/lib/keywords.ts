import { hasArkKind } from "@ark/schema"
import {
	append,
	ecmascriptConstructors,
	entriesOf,
	flatMorph,
	platformConstructors
} from "@ark/util"
import { ark, Generic } from "arktype"

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

// keywords resolve on first reference, so resolve them all
ark.export()

for (const [alias, v] of entriesOf(ark.internal.resolutions)
	.map(
		([alias, v]) =>
			[alias.endsWith(".root") ? alias.slice(0, -5) : alias, v] as const
	)
	.sort((l, r) => (l[0] < r[0] ? -1 : 1))) {
	// should not occur, only for temporary resolutions of cyclic definition
	if (hasArkKind(v, "context")) continue

	const name: KeywordTableName =
		alias.startsWith("string") ? "string"
		: alias.startsWith("number") ? "number"
		: alias.startsWith("FormData") ? "FormData"
		: alias.startsWith("Array") ? "array"
		: alias.startsWith("object") ? "object"
		: alias.startsWith("TypedArray") ? "TypedArray"
		: v instanceof Generic ? "generic"
		: alias in ecmascriptConstructors || alias in platformConstructors ?
			"instanceof"
		:	"other"

	keywordRowsByTable[name] = append(keywordRowsByTable[name], {
		alias,
		description: v.description
	})
}
