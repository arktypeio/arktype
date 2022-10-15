import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { type } from "../../api.js"

describe("diagnostics", () => {
    test("can rewrite messages", () => {
        const myNumber = type("3<number<5", {
            errors: {
                bound: {
                    message: ({ data, comparator, limit }) =>
                        `${data} not ${comparator}${limit}`
                }
            }
        })
        assert(myNumber.check(0).errors?.summary).equals("0 not >3")
    })
})
