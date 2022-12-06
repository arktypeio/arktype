import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { hasObjectType, hasType } from "../src/utils/typeOf.js"

describe("Utils", () => {
    test("hasTypeIn", () => {
        attest(hasType("string", { string: "hello" })).snap(true)
    })
    test("hasObjectSubtype", () => {
        attest(hasObjectType(["a", "b", "c"], "array")).snap(true)
        attest(
            hasObjectType(() => {
                console.log("a")
            }, "function")
        ).snap(true)
        attest(hasObjectType({ a: "abc" }, "dict")).snap(true)
    })
})
