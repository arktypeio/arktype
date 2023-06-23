import { suite, test } from "mocha"
import { node, scope, type } from "../../src/main.js"
import {
    prematureRestMessage,
    writeNonArrayRestMessage
} from "../../src/parse/tuple.js"
import { attest } from "../attest/main.js"

suite("tuple", () => {
    suite("intersections", () => {
        // TODO: this fails only when we run all the tests, so it's a caching issue
        test("array", () => {
            const tupleAndArray = type([{ a: "string" }, "[]"]).and([
                { b: "boolean" }
            ])
            // Check to make sure the intersection is evaluated
            attest(tupleAndArray.infer).types.toString.snap()
            const arrayAndTuple = type([{ b: "boolean" }, "[]"], "&", [
                { a: "string" }
            ])
            const expected = type([{ a: "string", b: "boolean" }])
            attest(tupleAndArray.condition).equals(expected.condition)
            attest(arrayAndTuple.condition).equals(expected.condition)
        })
    })
})
