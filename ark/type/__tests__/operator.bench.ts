import { bench } from "@ark/attest"
import { declare, type } from "arktype"

bench.baseline(() => {
	type("symbol")
	type("symbol[]")
	type("symbol").pipe(s => s)
	type(["symbol", "=>", s => s])
	type("symbol").narrow(() => true)
})

bench("array-string", () => type("number[]")).types([943, "instantiations"])

bench("array-tuple", () => type(["number", "[]"])).types([
	906,
	"instantiations"
])

bench("array-chain", () => type("number").array()).types([
	506,
	"instantiations"
])

bench("union-string", () => type("number|string")).types([
	1161,
	"instantiations"
])

bench("union-tuple", () => type(["number", "|", "string"])).types([
	1108,
	"instantiations"
])

bench("union-chain", () => type("number").or("string")).types([
	1435,
	"instantiations"
])

bench("union-10-ary", () => type("0|1|2|3|4|5|6|7|8|9")).types([
	4262,
	"instantiations"
])

bench("intersection-string", () => type("number&0")).types([
	1332,
	"instantiations"
])

bench("intersection-tuple", () => type(["number", "&", "0"])).types([
	1286,
	"instantiations"
])

bench("intersection-chain", () => type("number").and("0")).types([
	1661,
	"instantiations"
])

bench("intersection-10-ary", () =>
	type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
).types([5157, "instantiations"])

bench("group-shallow", () => type("string|(number[])")).types([
	1477,
	"instantiations"
])

bench("group-nested", () => type("string|(number|(boolean))[][]")).types([
	2218,
	"instantiations"
])

bench("group-deep", () => type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")).types([
	7387,
	"instantiations"
])

bench("bound-single", () => type("string>5")).types([1338, "instantiations"])

bench("bound-double", () => type("-7<=string.integer<99")).types([
	2076,
	"instantiations"
])

bench("divisor", () => type("number%5")).types([932, "instantiations"])

bench("filter-tuple", () => type(["boolean", ":", b => b])).types([
	1354,
	"instantiations"
])

bench("filter-chain", () => type("boolean").narrow(b => b)).types([
	751,
	"instantiations"
])

bench("morph-tuple", () => type(["boolean", "=>", b => b])).types([
	1456,
	"instantiations"
])

bench("morph-chain", () => type("boolean").pipe(b => b)).types([
	948,
	"instantiations"
])

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
).types([10872, "instantiations"])

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
).types([13034, "instantiations"])
