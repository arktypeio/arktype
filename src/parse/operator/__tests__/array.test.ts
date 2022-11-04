import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Arr } from "../array.js"

describe("parse array", () => {
    test("parse", () => {
        attest(type("string[]").infer).typed as string[]
    })
    describe("errors", () => {
        test("incomplete token", () => {
            // @ts-expect-error
            attest(() => type("string[")).throwsAndHasTypeError(
                Arr.incompleteTokenMessage
            )
        })
    })
})
