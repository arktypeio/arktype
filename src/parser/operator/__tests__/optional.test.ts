import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import { OptionalOperator } from "../optional.js"

describe("parse optional", () => {
    test("valid", () => {
        attest(type("object?").infer).typed as object | undefined
    })
    describe("errors", () => {
        test("bad inner type", () => {
            // @ts-expect-error
            attest(() => type("nonexistent?")).throwsAndHasTypeError(
                Unenclosed.buildUnresolvableMessage("nonexistent")
            )
        })
        test("non-suffix", () => {
            // @ts-expect-error
            attest(() => type("number?|string?")).throwsAndHasTypeError(
                OptionalOperator.nonTerminatingMessage
            )
        })
        test("multiple suffix", () => {
            // @ts-expect-error
            attest(() => type("boolean??")).throwsAndHasTypeError(
                OptionalOperator.nonTerminatingMessage
            )
        })
    })
})
