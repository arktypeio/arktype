import { arrayOf, intersection, morph, narrow, type, union } from "#arktype"
import { bench } from "#attest"

bench("string", () => {
    const _ = type("number[]")
})
    .median([934, "ns"])
    .type([134, "instantiations"])

bench("tuple", () => {
    const _ = type(["number", "[]"])
})
    .median([1.06, "us"])
    .type([146, "instantiations"])

bench("expression", () => {
    const _ = arrayOf("number")
})
    .median([1.11, "us"])
    .type([703, "instantiations"])
bench("string", () => {
    const _ = type("number|string")
})
    .median([498, "ns"])
    .type([817, "instantiations"])

bench("tuple", () => {
    const _ = type(["number", "|", "string"])
})
    .median([1.48, "us"])
    .type([307, "instantiations"])

bench("expression", () => {
    const _ = union("number", "string")
})
    .median([1.48, "us"])
    .type([1522, "instantiations"])

bench("10-ary", () => {
    const _ = type("0|1|2|3|4|5|6|7|8|9")
})
    .median([16.64, "us"])
    .type([5605, "instantiations"])
bench("string", () => {
    const _ = type("number&0")
})
    .median([511, "ns"])
    .type([787, "instantiations"])

bench("tuple", () => {
    const _ = type(["number", "&", "0"])
})
    .median([1.76, "us"])
    .type([517, "instantiations"])

bench("expression", () => {
    const _ = intersection("number", "0")
})
    .median([1.74, "us"])
    .type([1717, "instantiations"])

bench("10-ary", () => {
    const _ = type(
        "unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown&unknown"
    )
})
    .median([707, "ns"])
    .type([4131, "instantiations"])
bench("shallow", () => {
    const _ = type("string|(number[])")
})
    .median([1.04, "us"])
    .type([1121, "instantiations"])

bench("nested", () => {
    const _ = type("string|(number|(boolean))[][]")
})
    .median([1.44, "us"])
    .type([3308, "instantiations"])

bench("deep", () => {
    const _ = type("(0|(1|(2|(3|(4|5)[])[])[])[])[]")
})
    .median([5.34, "us"])
    .type([36744, "instantiations"])
bench("single", () => {
    const _ = type("string>5")
})
    .median([616, "ns"])
    .type([682, "instantiations"])

bench("double", () => {
    const _ = type("-7<=integer<99")
})
    .median([780, "ns"])
    .type([1088, "instantiations"])
bench("divisor", () => {
    const _ = type("number%5")
})
    .median([560, "ns"])
    .type([1401, "instantiations"])
bench("tuple expression", () => {
    const _ = type(["boolean", "=>", (b) => b])
})
    .median([1.09, "us"])
    .type([409, "instantiations"])
bench("helper", () => {
    const _ = narrow("boolean", (b) => b)
})
    .median([1.09, "us"])
    .type([1059, "instantiations"])
bench("tuple expression", () => {
    const _ = type(["boolean", "|>", (b) => b])
})
    .median([686, "ns"])
    .type([336, "instantiations"])
bench("helper", () => {
    const _ = morph("boolean", (b) => b)
})
    .median([794, "ns"])
    .type([878, "instantiations"])
