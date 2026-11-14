import { hasArkKind } from "@ark/schema"
import {
	append,
	ecmascriptConstructors,
	entriesOf,
	flatMorph,
	platformConstructors,
	typedArrayConstructors
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

const seen = new Set<string>()

for (const [alias, v] of entriesOf(ark.internal.res)
	.map(
		([alias, v]) =>
			[alias.endsWith(".root") ? alias.slice(0, -5) : alias, v] as const
	)
	.sort((l, r) => (l[0] < r[0] ? -1 : 1))) {
	// should not occur, only for temporary resolutions of cyclic definition
	if (hasArkKind(v, "context")) continue
	// a module's root resolves both as "string" and "string.root"
	if (seen.has(alias)) continue
	seen.add(alias)

	const name: KeywordTableName =
		alias.startsWith("string") ? "string"
		: alias.startsWith("number") ? "number"
		: alias.startsWith("FormData") ? "FormData"
		: alias.startsWith("Array") ? "array"
		: alias.startsWith("object") ? "object"
		: alias.startsWith("TypedArray") || alias in typedArrayConstructors ?
			"TypedArray"
		: v instanceof Generic ? "generic"
		: alias in ecmascriptConstructors || alias in platformConstructors ?
			"instanceof"
		:	"other"

	keywordRowsByTable[name] = append(keywordRowsByTable[name], {
		alias,
		description: v.description
	})
}
