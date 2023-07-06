import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeUnresolvableMessage } from "../../src/parser/string/shift/operand/unenclosed.js"

suite("this reference", () => {
    test("resolves from type", () => {
        const disappointingGift = type({
            label: "string",
            "box?": "this"
        })

        type ExpectedDisappointingGift = {
            label: string
            box?: ExpectedDisappointingGift
        }
        attest(disappointingGift.infer).typed as ExpectedDisappointingGift
    })

    test("doesn't change when rereferenced", () => {
        const initial = type({
            initial: "this"
        })

        const reference = type({
            reference: initial
        })
        type Initial = {
            initial: Initial
        }
        type Expected = {
            reference: Initial
        }

        attest(reference.infer).typed as Expected
        const types = scope({
            initial: {
                initial: "initial"
            },
            reference: {
                reference: "initial"
            }
        }).export()
        attest(reference.condition).equals(types.reference.condition)
    })

    test("unresolvable in scope", () => {
        attest(() =>
            scope({
                disappointingGift: {
                    label: "string",
                    // @ts-expect-error
                    "box?": "this"
                }
            }).export()
        ).throwsAndHasTypeError(writeUnresolvableMessage("this"))
    })
})
