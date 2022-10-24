import { assert } from "#testing"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Operand } from "../operand/operand.js"
import { Unenclosed } from "../operand/unenclosed.js"
import { Scanner } from "../state/scanner.js"

describe("str", () => {
    test("errors on empty string", () => {
        // @ts-expect-error
        assert(() => type("")).throwsAndHasTypeError(
            Operand.buildExpressionExpectedMessage("")
        )
    })
    test("ignores whitespace between identifiers/operators", () => {
        const modelWithWhitespace = type("     string  | boolean    []   ")
        assert(modelWithWhitespace.infer).typed as string | boolean[]
    })
    test("errors on bad whitespace", () => {
        assert(() =>
            // @ts-expect-error
            type("string | boo lean[]")
        ).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("boo"))
    })
})
