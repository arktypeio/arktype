import { bench } from "@ark/attest"
import { type } from "arktype"

type("never")

bench("array-string", () => {
	const _ = type("number[]")
}).types([566, "instantiations"])

bench("array-tuple", () => {
	const _ = type(["number", "[]"])
}).types([3295, "instantiations"])

bench("array-chain", () => {
	const _ = type("number").array()
}).types([373, "instantiations"])

bench("union-string", () => {
	const _ = type("number|string")
}).types([925, "instantiations"])

bench("union-tuple", () => {
	const _ = type(["number", "|", "string"])
}).types([4071, "instantiations"])

bench("union-chain", () => {
	const _ = type("number").or("string")
}).types([1383, "instantiations"])

bench("union-10-ary", () => {
	const _ = type("0|1|2|3|4|5|6|7|8|9")
}).types([3547, "instantiations"])

bench("intersection-string", () => {
	const _ = type("number&0")
}).types([1039, "instantiations"])

bench("intersection-tuple", () => {
	const _ = type(["number", "&", "0"])
}).types([4184, "instantiations"])

bench("intersection-chain", () => {
	const _ = type("number").and("0")
}).types([1501, "instantiations"])

bench("intersection-10-ary", () => {
	const _ = type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
}).types([4478, "instantiations"])

bench("group-shallow", () => {
	const _ = type("string|(number[])")
}).types([1164, "instantiations"])

bench("group-nested", () => {
	const _ = type("string|(number|(boolean))[][]")
}).types([1770, "instantiations"])

bench("group-deep", () => {
	const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
}).types([4603, "instantiations"])

bench("bound-single", () => {
	const _ = type("string>5")
}).types([1732, "instantiations"])

bench("bound-double", () => {
	const _ = type("-7<=integer<99")
}).types([2492, "instantiations"])

bench("divisor", () => {
	const _ = type("number%5")
}).types([1214, "instantiations"])

bench("filter-tuple", () => {
	const _ = type(["boolean", ":", b => b])
}).types([20919, "instantiations"])

bench("filter-chain", () => {
	const _ = type("boolean").narrow(b => b)
}).types([917, "instantiations"])

bench("morph-tuple", () => {
	const _ = type(["boolean", "=>", b => b])
}).types([20774, "instantiations"])

bench("morph-chain", () => {
	const _ = type("boolean").pipe(b => b)
}).types([599, "instantiations"])
