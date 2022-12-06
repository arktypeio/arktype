import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { hasObjectSubtype, hasType } from "../src/utils/typeOf.js"

describe("Utils", () => {
    test("hasTypeIn", () => {
        attest(hasType("string", { string: "hello" })).snap(true)
    })
    test("hasObjectSubtype", () => {
        attest(hasObjectSubtype(["a", "b", "c"], "array")).snap(true)
        attest(
            hasObjectSubtype(() => {
                console.log("a")
            }, "function")
        ).snap(true)
        attest(hasObjectSubtype({ a: "abc" }, "dict")).snap(true)
    })
})
