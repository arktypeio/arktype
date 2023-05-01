import {
    arrayOf,
    intersection,
    morph,
    narrow,
    type,
    union
} from "../../src/main.js"
import { bench } from "../attest/main.js"

bench("string", () => {
    const _ = type("number[]")
})
    .median([934, "ns"])
    .types([134, "instantiations"])

bench("tuple", () => {
    const _ = type(["number", "[]"])
})
    .median([1.06, "us"])
    .types([146, "instantiations"])

bench("expression", () => {
    const _ = arrayOf("number")
})
    .median([1.11, "us"])
    .types([703, "instantiations"])
bench("string", () => {
    const _ = type("number|string")
})
    .median([498, "ns"])
    .types([817, "instantiations"])

bench("tuple", () => {
    const _ = type(["number", "|", "string"])
})
    .median([1.48, "us"])
    .types([307, "instantiations"])

bench("expression", () => {
    const _ = union("number", "string")
})
    .median([1.48, "us"])
    .types([1522, "instantiations"])

bench("10-ary", () => {
    const _ = type("0|1|2|3|4|5|6|7|8|9")
})
    .median([16.64, "us"])
    .types([5605, "instantiations"])
bench("string", () => {
    const _ = type("number&0")
})
    .median([511, "ns"])
    .types([787, "instantiations"])

bench("tuple", () => {
    const _ = type(["number", "&", "0"])
})
    .median([1.76, "us"])
    .types([517, "instantiations"])

bench("expression", () => {
    const _ = intersection("number", "0")
})
    .median([1.74, "us"])
    .types([1717, "instantiations"])

bench("10-ary", () => {
    const _ = type(
        "unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
    )
})
    .median([707, "ns"])
    .types([4131, "instantiations"])
bench("shallow", () => {
    const _ = type("string|(number[])")
})
    .median([1.04, "us"])
    .types([1121, "instantiations"])

bench("nested", () => {
    const _ = type("string|(number|(boolean))[][]")
})
    .median([1.44, "us"])
    .types([3308, "instantiations"])

bench("deep", () => {
    const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
})
    .median([5.34, "us"])
    .types([36744, "instantiations"])
bench("single", () => {
    const _ = type("string>5")
})
    .median([616, "ns"])
    .types([682, "instantiations"])

bench("double", () => {
    const _ = type("-7<=integer<99")
})
    .median([780, "ns"])
    .types([1088, "instantiations"])
bench("divisor", () => {
    const _ = type("number%5")
})
    .median([560, "ns"])
    .types([1401, "instantiations"])
bench("tuple expression", () => {
    const _ = type(["boolean", "=>", (b) => b])
})
    .median([1.09, "us"])
    .types([409, "instantiations"])
bench("helper", () => {
    const _ = narrow("boolean", (b) => b)
})
    .median([1.09, "us"])
    .types([1059, "instantiations"])
bench("tuple expression", () => {
    const _ = type(["boolean", "|>", (b) => b])
})
    .median([686, "ns"])
    .types([336, "instantiations"])
bench("helper", () => {
    const _ = morph("boolean", (b) => b)
})
    .median([794, "ns"])
    .types([878, "instantiations"])
