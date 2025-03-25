import { type } from "arktype"
import type { UnionTypeParser } from "arktype/internal/type.ts"

const types = [
	"Normal",
	"Fire",
	"Water",
	"Electric",
	"Grass",
	"Ice",
	"Fighting",
	"Poison",
	"Ground",
	"Flying",
	"Psychic",
	"Bug",
	"Rock",
	"Ghost",
	"Dragon",
	"Dark",
	"Steel",
	"Fairy"
] as const

const pokemon = type({
	type: type.enumerated(...types)
})

declare const union: UnionTypeParser<{}>

const t = type(() => true)
