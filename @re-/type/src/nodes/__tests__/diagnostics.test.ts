import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { data } from "../../__snippets__/type.js"
import { type } from "../../api.js"

describe("diagnostics", () => {
    test("can rewrite messages", () => {
        const myNumber = type("3<number<5", {
            errors: {
                bound: {
                    message: ({ context: { data, comparator, limit } }) =>
                        `${data} not ${comparator}${limit}`
                },
                typeKeyword: {
                    message: (args) => {}
                }
            }
        })
        assert(myNumber.check(0).errors?.summary).equals("0 not >3")
    })
})
