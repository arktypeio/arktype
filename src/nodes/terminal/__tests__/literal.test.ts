import { describe, test } from "mocha"
import { type } from "../../../type.js"
import { assert } from "#testing"

describe("literal", () => {
    test("check", () => {
        assert(type("'dursurdo'").check("dursurdo").problems).is(undefined)
        assert(type("1n").check(1).problems?.summary).snap(`Must be 1n (was 1)`)
    })
})
