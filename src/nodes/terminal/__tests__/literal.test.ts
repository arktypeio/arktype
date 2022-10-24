import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("literal", () => {
    test("check", () => {
        attest(type("'dursurdo'").check("dursurdo").problems).is(undefined)
        attest(type("1n").check(1).problems?.summary).snap(`Must be 1n (was 1)`)
    })
})
