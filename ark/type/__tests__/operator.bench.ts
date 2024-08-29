import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type("symbol")
	type("symbol").pipe(s => s)
	type(["symbol", "=>", s => s])
	type("symbol").narrow(s => true)
})

bench("array-string", () => {
	const _ = type("number[]")
}).types([2007, "instantiations"])

bench("array-tuple", () => {
	const _ = type(["number", "[]"])
}).types([1965, "instantiations"])

bench("array-chain", () => {
	const _ = type("number").array()
}).types([471, "instantiations"])

bench("union-string", () => {
	const _ = type("number|string")
}).types([1128, "instantiations"])

bench("union-tuple", () => {
	const _ = type(["number", "|", "string"])
}).types([1395, "instantiations"])

bench("union-chain", () => {
	const _ = type("number").or("string")
}).types([1620, "instantiations"])

bench("union-10-ary", () => {
	const _ = type("0|1|2|3|4|5|6|7|8|9")
}).types([4281, "instantiations"])

bench("intersection-string", () => {
	const _ = type("number&0")
}).types([1087, "instantiations"])

bench("intersection-tuple", () => {
	const _ = type(["number", "&", "0"])
}).types([1353, "instantiations"])

bench("intersection-chain", () => {
	const _ = type("number").and("0")
}).types([1605, "instantiations"])

bench("intersection-10-ary", () => {
	const _ = type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
}).types([4985, "instantiations"])

bench("group-shallow", () => {
	const _ = type("string|(number[])")
}).types([1467, "instantiations"])

bench("group-nested", () => {
	const _ = type("string|(number|(boolean))[][]")
}).types([2203, "instantiations"])

bench("group-deep", () => {
	const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
}).types([8040, "instantiations"])

bench("bound-single", () => {
	const _ = type("string>5")
}).types([1600, "instantiations"])

bench("bound-double", () => {
	const _ = type("-7<=string.integer<99")
}).types([2777, "instantiations"])

bench("divisor", () => {
	const _ = type("number%5")
}).types([1139, "instantiations"])

bench("filter-tuple", () => {
	const _ = type(["boolean", ":", b => b])
}).types([1409, "instantiations"])

bench("filter-chain", () => {
	const _ = type("boolean").narrow(b => b)
}).types([905, "instantiations"])

bench("morph-tuple", () => {
	const _ = type(["boolean", "=>", b => b])
}).types([1318, "instantiations"])

bench("morph-chain", () => {
	const _ = type("boolean").pipe(b => b)
}).types([912, "instantiations"])
