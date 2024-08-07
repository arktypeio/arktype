import { bench } from "@ark/attest"
import { type } from "arktype"

bench.baseline(() => {
	type("symbol")
	type("symbol").pipe(s => s)
	type("symbol").narrow(s => true)
})

bench("array-string", () => {
	const _ = type("number[]")
}).types([1910, "instantiations"])

bench("array-tuple", () => {
	const _ = type(["number", "[]"])
}).types([5068, "instantiations"])

bench("array-chain", () => {
	const _ = type("number").array()
}).types([393, "instantiations"])

bench("union-string", () => {
	const _ = type("number|string")
}).types([948, "instantiations"])

bench("union-tuple", () => {
	const _ = type(["number", "|", "string"])
}).types([4657, "instantiations"])

bench("union-chain", () => {
	const _ = type("number").or("string")
}).types([1460, "instantiations"])

bench("union-10-ary", () => {
	const _ = type("0|1|2|3|4|5|6|7|8|9")
}).types([3623, "instantiations"])

bench("intersection-string", () => {
	const _ = type("number&0")
}).types([1075, "instantiations"])

bench("intersection-tuple", () => {
	const _ = type(["number", "&", "0"])
}).types([4783, "instantiations"])

bench("intersection-chain", () => {
	const _ = type("number").and("0")
}).types([1596, "instantiations"])

bench("intersection-10-ary", () => {
	const _ = type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
}).types([4510, "instantiations"])

bench("group-shallow", () => {
	const _ = type("string|(number[])")
}).types([1239, "instantiations"])

bench("group-nested", () => {
	const _ = type("string|(number|(boolean))[][]")
}).types([1853, "instantiations"])

bench("group-deep", () => {
	const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
}).types([7555, "instantiations"])

bench("bound-single", () => {
	const _ = type("string>5")
}).types([1644, "instantiations"])

bench("bound-double", () => {
	const _ = type("-7<=integer<99")
}).types([2431, "instantiations"])

bench("divisor", () => {
	const _ = type("number%5")
}).types([1131, "instantiations"])

bench("filter-tuple", () => {
	const _ = type(["boolean", ":", b => b])
}).types([22977, "instantiations"])

bench("filter-chain", () => {
	const _ = type("boolean").narrow(b => b)
}).types([746, "instantiations"])

bench("morph-tuple", () => {
	const _ = type(["boolean", "=>", b => b])
}).types([22933, "instantiations"])

bench("morph-chain", () => {
	const _ = type("boolean").pipe(b => b)
}).types([753, "instantiations"])
