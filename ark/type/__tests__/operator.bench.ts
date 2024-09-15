import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type("symbol")
	type("symbol[]")
	type("symbol").pipe(s => s)
	type(["symbol", "=>", s => s])
	type("symbol").narrow(s => true)
})

bench("array-string", () => {
	const _ = type("number[]")
}).types([905, "instantiations"])

bench("array-tuple", () => {
	const _ = type(["number", "[]"])
}).types([902, "instantiations"])

bench("array-chain", () => {
	const _ = type("number").array()
}).types([474, "instantiations"])

bench("union-string", () => {
	const _ = type("number|string")
}).types([1115, "instantiations"])

bench("union-tuple", () => {
	const _ = type(["number", "|", "string"])
}).types([989, "instantiations"])

bench("union-chain", () => {
	const _ = type("number").or("string")
}).types([1659, "instantiations"])

bench("union-10-ary", () => {
	const _ = type("0|1|2|3|4|5|6|7|8|9")
}).types([4268, "instantiations"])

bench("intersection-string", () => {
	const _ = type("number&0")
}).types([1074, "instantiations"])

bench("intersection-tuple", () => {
	const _ = type(["number", "&", "0"])
}).types([947, "instantiations"])

bench("intersection-chain", () => {
	const _ = type("number").and("0")
}).types([1644, "instantiations"])

bench("intersection-10-ary", () => {
	const _ = type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
}).types([4997, "instantiations"])

bench("group-shallow", () => {
	const _ = type("string|(number[])")
}).types([1424, "instantiations"])

bench("group-nested", () => {
	const _ = type("string|(number|(boolean))[][]")
}).types([2160, "instantiations"])

bench("group-deep", () => {
	const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
}).types([6938, "instantiations"])

bench("bound-single", () => {
	const _ = type("string>5")
}).types([1617, "instantiations"])

bench("bound-double", () => {
	const _ = type("-7<=string.integer<99")
}).types([2773, "instantiations"])

bench("divisor", () => {
	const _ = type("number%5")
}).types([1142, "instantiations"])

bench("filter-tuple", () => {
	const _ = type(["boolean", ":", b => b])
}).types([1384, "instantiations"])

bench("filter-chain", () => {
	const _ = type("boolean").narrow(b => b)
}).types([906, "instantiations"])

bench("morph-tuple", () => {
	const _ = type(["boolean", "=>", b => b])
}).types([1301, "instantiations"])

bench("morph-chain", () => {
	const _ = type("boolean").pipe(b => b)
}).types([925, "instantiations"])
