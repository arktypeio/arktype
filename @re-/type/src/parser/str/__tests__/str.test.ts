import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { unresolvableMessage } from "../operand/unenclosed.js"
import { expressionExpectedMessage } from "../state/state.js"

describe("str", () => {
    test("errors on empty string", () => {
        // @ts-expect-error
        assert(() => type("")).throwsAndHasTypeError(
            expressionExpectedMessage("")
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
        ).throwsAndHasTypeError(unresolvableMessage("boo"))
    })
})
