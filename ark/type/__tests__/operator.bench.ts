import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type("symbol")
	type("symbol[]")
	type("symbol").pipe(s => s)
	type(["symbol", "=>", s => s])
	type("symbol").narrow(() => true)
})

bench("array-string", () => type("number[]")).types([939, "instantiations"])

bench("array-tuple", () => type(["number", "[]"])).types([
	898,
	"instantiations"
])

bench("array-chain", () => type("number").array()).types([
	502,
	"instantiations"
])

bench("union-string", () => type("number|string")).types([
	1157,
	"instantiations"
])

bench("union-tuple", () => type(["number", "|", "string"])).types([
	1096,
	"instantiations"
])

bench("union-chain", () => type("number").or("string")).types([
	1502,
	"instantiations"
])

bench("union-10-ary", () => type("0|1|2|3|4|5|6|7|8|9")).types([
	4258,
	"instantiations"
])

bench("intersection-string", () => type("number&0")).types([
	1328,
	"instantiations"
])

bench("intersection-tuple", () => type(["number", "&", "0"])).types([
	1274,
	"instantiations"
])

bench("intersection-chain", () => type("number").and("0")).types([
	1728,
	"instantiations"
])

bench("intersection-10-ary", () =>
	type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
).types([5153, "instantiations"])

bench("group-shallow", () => type("string|(number[])")).types([
	1473,
	"instantiations"
])

bench("group-nested", () => type("string|(number|(boolean))[][]")).types([
	2214,
	"instantiations"
])

bench("group-deep", () => type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")).types([
	7383,
	"instantiations"
])

bench("bound-single", () => type("string>5")).types([1480, "instantiations"])

bench("bound-double", () => type("-7<=string.integer<99")).types([
	2253,
	"instantiations"
])

bench("divisor", () => type("number%5")).types([1074, "instantiations"])

bench("filter-tuple", () => type(["boolean", ":", b => b])).types([
	1338,
	"instantiations"
])

bench("filter-chain", () => type("boolean").narrow(b => b)).types([
	738,
	"instantiations"
])

bench("morph-tuple", () => type(["boolean", "=>", b => b])).types([
	1440,
	"instantiations"
])

bench("morph-chain", () => type("boolean").pipe(b => b)).types([
	944,
	"instantiations"
])
