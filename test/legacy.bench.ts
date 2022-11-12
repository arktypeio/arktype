import { bench, suite } from "../dev/attest/exports.js"
import { type } from "../arktype.js"

suite("legacy", () => {
    bench("validate string", () => {
        type("string").check("test")
    }).median([119.0, "ns"])

    const deepStringDef = "string|".repeat(20).slice(0, -1)

    bench("parse deeep", () => {
        type.dynamic(deepStringDef)
    }).median([6.19, "us"])

    bench("parse and validate deeep", () => {
        type.dynamic(deepStringDef).check("test")
    }).median([6.21, "us"])

    bench("parseUnion", () => {
        const result = type("string|number")
    }).median([894.0, "ns"])

    // Marked as any so that we can still measure instantiations in parse union
    const smallUnion = type.dynamic("string|number")

    bench("validate small union second", () => {
        smallUnion.check(5)
    }).median([169.0, "ns"])

    bench("validate small union first", () => {
        smallUnion.check("")
    }).median([82.0, "ns"])

    bench("parse large union", () => {
        type("1|2|3|4|5|6|7|8|9")
    }).median([1.42, "us"])

    bench("parse then validate large union", () => {
        type("1|2|3|4|5|6|7|8|9").check(5)
    }).median([2.17, "us"])

    bench("parse then validate large union first", () => {
        type("1|2|3|4|5|6|7|8|9").check(1)
    }).median([1.52, "us"])

    bench("parse then validate large union miss", () => {
        type("1|2|3|4|5|6|7|8|9").check(10)
    }).median([5.44, "us"])

    bench("list type", () => {
        type("string[]").check(["hi", "there", "we're", "strings", 5])
    }).median([1.21, "us"])
})
