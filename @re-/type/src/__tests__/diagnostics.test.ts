import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../index.js"

describe("diagnostics", () => {
    test("can rewrite messages", () => {
        assert(
            type("3<number<5").check(0, {
                diagnostics: {
                    BoundViolation: {
                        message: ({ data, comparator, limit }) =>
                            `${data} not ${comparator}${limit}`
                    }
                }
            }).errors?.summary
        ).equals("0 not >3")
    })
})
