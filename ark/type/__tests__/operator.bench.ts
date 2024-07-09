import { bench } from "@arktype/attest"
import { type } from "arktype"

bench("array-string", () => {
	const _ = type("number[]")
}).types([2654, "instantiations"])

bench("array-tuple", () => {
	const _ = type(["number", "[]"])
}).types([5326, "instantiations"])

bench("array-chain", () => {
	const _ = type("number").array()
}).types([2524, "instantiations"])

bench("union-string", () => {
	const _ = type("number|string")
}).types([3051, "instantiations"])

bench("union-tuple", () => {
	const _ = type(["number", "|", "string"])
}).types([6155, "instantiations"])

bench("union-chain", () => {
	const _ = type("number").or("string")
}).types([3510, "instantiations"])

bench("union-10-ary", () => {
	const _ = type("0|1|2|3|4|5|6|7|8|9")
}).types([5695, "instantiations"])

bench("intersection-string", () => {
	const _ = type("number&0")
}).types([3214, "instantiations"])

bench("intersection-tuple", () => {
	const _ = type(["number", "&", "0"])
}).types([6317, "instantiations"])

bench("intersection-chain", () => {
	const _ = type("number").and("0")
}).types([3677, "instantiations"])

bench("intersection-10-ary", () => {
	const _ = type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
}).types([6533, "instantiations"])

bench("group-shallow", () => {
	const _ = type("string|(number[])")
}).types([3290, "instantiations"])

bench("group-nested", () => {
	const _ = type("string|(number|(boolean))[][]")
}).types([3819, "instantiations"])

bench("group-deep", () => {
	const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
}).types([6693, "instantiations"])

bench("bound-single", () => {
	const _ = type("string>5")
}).types([4828, "instantiations"])

bench("bound-double", () => {
	const _ = type("-7<=integer<99")
}).types([5589, "instantiations"])

bench("divisor", () => {
	const _ = type("number%5")
}).types([4314, "instantiations"])

bench("filter-tuple", () => {
	const _ = type(["boolean", ":", b => b])
}).types([21867, "instantiations"])

bench("filter-chain", () => {
	const _ = type("boolean").narrow(b => b)
}).types([4014, "instantiations"])

bench("morph-tuple", () => {
	const _ = type(["boolean", "=>", b => b])
}).types([24942, "instantiations"])

bench("morph-chain", () => {
	const _ = type("boolean").pipe(b => b)
}).types([7038, "instantiations"])
