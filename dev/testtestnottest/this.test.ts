import { describe, it } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("this reference", () => {
    it("resolves from type", () => {
        const disappointingGift = type({ label: "string", "box?": "this" })
        type ExpectedDisappointingGift = {
            label: string
            box?: ExpectedDisappointingGift
        }

        attest(disappointingGift.infer).typed as ExpectedDisappointingGift
        attest(disappointingGift.toString()).snap()
    })
    it("unresolvable in scope", () => {
        attest(() =>
            scope({
                disappointingGift: {
                    label: "string",
                    // @ts-expect-error
                    "box?": "this"
                }
            }).compile()
        ).throwsAndHasTypeError(writeUnresolvableMessage("this"))
    })
})
