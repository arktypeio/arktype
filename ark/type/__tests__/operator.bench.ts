import { bench } from "@arktype/attest"
import { type } from "arktype"

bench("array-string", () => {
	const _ = type("number[]")
})
	.median([3.18, "us"])
	.types([99, "instantiations"])

bench("array-tuple", () => {
	const _ = type(["number", "[]"])
})
	.median([3.47, "us"])
	.types([212, "instantiations"])

bench("array-chain", () => {
	const _ = type("number").array()
})
	.median([5.15, "us"])
	.types([5, "instantiations"])

bench("union-string", () => {
	const _ = type("number|string")
})
	.median([7.07, "us"])
	.types([777, "instantiations"])

bench("union-tuple", () => {
	const _ = type(["number", "|", "string"])
})
	.median([5.59, "us"])
	.types([273, "instantiations"])

bench("union-chain", () => {
	const _ = type("number").or("string")
})
	.median([7.09, "us"])
	.types([488, "instantiations"])

bench("union-10-ary", () => {
	const _ = type("0|1|2|3|4|5|6|7|8|9")
})
	.median([119.87, "us"])
	.types([4841, "instantiations"])

bench("intersection-string", () => {
	const _ = type("number&0")
})
	.median([3.61, "us"])
	.types([686, "instantiations"])

bench("intersection-tuple", () => {
	const _ = type(["number", "&", "0"])
})
	.median([3.16, "us"])
	.types([474, "instantiations"])

bench("intersection-chain", () => {
	const _ = type("number").and("0")
})
	.median([4.78, "us"])
	.types([687, "instantiations"])

bench("intersection-10-ary", () => {
	const _ = type(
		"unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
	)
})
	.median([12.61, "us"])
	.types([4351, "instantiations"])

bench("group-shallow", () => {
	const _ = type("string|(number[])")
})
	.median([9.58, "us"])
	.types([1080, "instantiations"])

bench("group-nested", () => {
	const _ = type("string|(number|(boolean))[][]")
})
	.median([17.22, "us"])
	.types([3008, "instantiations"])

bench("group-deep", () => {
	const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
})
	.median([32.5, "us"])
	.types([37638, "instantiations"])

bench("bound-single", () => {
	const _ = type("string>5")
})
	.median([3.81, "us"])
	.types([615, "instantiations"])

bench("bound-double", () => {
	const _ = type("-7<=integer<99")
})
	.median([7.2, "us"])
	.types([1041, "instantiations"])

bench("divisor", () => {
	const _ = type("number%5")
})
	.median([4.53, "us"])
	.types([1023, "instantiations"])

bench("filter-tuple", () => {
	const _ = type(["boolean", ":", b => b])
})
	.median([8.04, "us"])
	.types([583, "instantiations"])

bench("filter-chain", () => {
	const _ = type("boolean").narrow(b => b)
})
	.median([12.19, "us"])
	.types([42, "instantiations"])

bench("morph-tuple", () => {
	const _ = type(["boolean", "=>", b => b])
})
	.median([8.96, "us"])
	.types([562, "instantiations"])

bench("morph-chain", () => {
	const _ = type("boolean").pipe(b => b)
})
	.median([2.98, "us"])
	.types([26, "instantiations"])
