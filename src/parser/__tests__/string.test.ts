import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../api.js"
import { Operand } from "../operand/operand.js"
import { Unenclosed } from "../operand/unenclosed.js"

describe("string", () => {
    test("errors on empty string", () => {
        // @ts-expect-error
        attest(() => type("")).throwsAndHasTypeError(
            Operand.buildExpressionExpectedMessage("")
        )
    })
    test("ignores whitespace between identifiers/operators", () => {
        const modelWithWhitespace = type("     string  | boolean    []   ")
        attest(modelWithWhitespace.infer).typed as string | boolean[]
    })
    test("errors on bad whitespace", () => {
        attest(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("boo"))
    })
})
