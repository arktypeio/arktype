import { bench } from "@ark/attest"
import { declare, type } from "arktype"

bench.baseline(() => {
	type("symbol")
	type("symbol[]")
	type("symbol").pipe(s => s)
	type(["symbol", "=>", s => s])
	type("symbol").narrow(() => true)
})

bench("array-string", () => type("number[]")).types([522, "instantiations"])

bench("array-tuple", () => type(["number", "[]"])).types([
	515,
	"instantiations"
])

bench("array-chain", () => type("number").array()).types([
	427,
	"instantiations"
])

bench("union-string", () => type("number|string")).types([
	830,
	"instantiations"
])

bench("union-tuple", () => type(["number", "|", "string"])).types([
	916,
	"instantiations"
])

bench("union-chain", () => type("number").or("string")).types([
	1129,
	"instantiations"
])

bench("union-10-ary", () => type("0|1|2|3|4|5|6|7|8|9")).types([
	3193,
	"instantiations"
])

bench("intersection-string", () => type("number&0")).types([
	819,
	"instantiations"
])

bench("intersection-tuple", () => type(["number", "&", "0"])).types([
	908,
	"instantiations"
])

bench("intersection-chain", () => type("number").and("0")).types([
	1184,
	"instantiations"
])

bench("intersection-10-ary", () =>
	type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
).types([3685, "instantiations"])

bench("group-shallow", () => type("string|(number[])")).types([
	1029,
	"instantiations"
])

bench("group-nested", () => type("string|(number|(boolean))[][]")).types([
	1666,
	"instantiations"
])

bench("group-deep", () => type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")).types([
	3155,
	"instantiations"
])

bench("bound-single", () => type("string>5")).types([893, "instantiations"])

bench("bound-double", () => type("-7<=string.integer<99")).types([
	1379,
	"instantiations"
])

bench("divisor", () => type("number%5")).types([606, "instantiations"])

bench("filter-tuple", () => type(["boolean", ":", b => b])).types([
	1115,
	"instantiations"
])

bench("filter-chain", () => type("boolean").narrow(b => b)).types([
	597,
	"instantiations"
])

bench("morph-tuple", () => type(["boolean", "=>", b => b])).types([
	1147,
	"instantiations"
])

bench("morph-chain", () => type("boolean").pipe(b => b)).types([
	706,
	"instantiations"
])

const A = type("'a'")

bench("morph-chain-all", () => {
	const out = A.pipe(
		s => `${s}b` as const,
		s => `${s}c` as const,
		s => `${s}d` as const,
		s => `${s}e` as const,
		s => `${s}f` as const,
		s => `${s}g` as const,
		s => `${s}h` as const,
		s => `${s}i` as const,
		s => `${s}j` as const,
		s => `${s}k` as const,
		s => `${s}l` as const,
		s => `${s}m` as const,
		s => `${s}n` as const,
		s => `${s}o` as const,
		s => `${s}p` as const,
		s => `${s}q` as const,
		s => `${s}r` as const
	)
	return out
}).types([2697, "instantiations"])

bench("to-string", () => type("string.numeric.parse |> number.integer")).types([
	1523,
	"instantiations"
])

bench("to-chain", () =>
	type("string.numeric.parse").to("number.integer")
).types([1750, "instantiations"])

bench("to-tuple", () =>
	type(["string.numeric.parse", "|>", "number.integer"])
).types([1469, "instantiations"])

bench("to-args", () =>
	type("string.numeric.parse", "|>", "number.integer")
).types([3197, "instantiations"])

bench("base object", () =>
	type({
		readonly: "'readonly'",
		keyof: "'keyof'",
		get: "'get'",
		pick: "'pick'",
		omit: "'omit'",
		merge: "'merge'",
		required: "'required'",
		partial: "'partial'",
		map: "'map'",
		as: "'as'",
		and: "'and'",
		or: "'or'",
		extract: "'extract'",
		exclude: "'exclude'",
		configure: "'configure'",
		describe: "'describe'",
		onUndeclaredKey: "'onUndeclaredKey'",
		onDeepUndeclaredKey: "'onDeepUndeclaredKey'",
		brand: "'brand'",
		array: "'array'",
		filter: "'filter'",
		narrow: "'narrow'"
	})
).types([10980, "instantiations"])

type Expected = {
	readonly: "readonly"
	keyof: "keyof"
	get: "get"
	pick: "pick"
	omit: "omit"
	merge: "merge"
	required: "required"
	partial: "partial"
	map: "map"
	as: "as"
	and: "and"
	or: "or"
	extract: "extract"
	exclude: "exclude"
	configure: "configure"
	describe: "describe"
	onUndeclaredKey: "onUndeclaredKey"
	onDeepUndeclaredKey: "onDeepUndeclaredKey"
	brand: "brand"
	array: "array"
	filter: "filter"
	narrow: "narrow"
}

bench("base object", () =>
	declare<Expected>().type({
		readonly: "'readonly'",
		keyof: "'keyof'",
		get: "'get'",
		pick: "'pick'",
		omit: "'omit'",
		merge: "'merge'",
		required: "'required'",
		partial: "'partial'",
		map: "'map'",
		as: "'as'",
		and: "'and'",
		or: "'or'",
		extract: "'extract'",
		exclude: "'exclude'",
		configure: "'configure'",
		describe: "'describe'",
		onUndeclaredKey: "'onUndeclaredKey'",
		onDeepUndeclaredKey: "'onDeepUndeclaredKey'",
		brand: "'brand'",
		array: "'array'",
		filter: "'filter'",
		narrow: "'narrow'"
	})
).types([13362, "instantiations"])
