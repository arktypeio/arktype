import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { scope } from "../scope.js"

describe("scopes", () => {
    test("parent scope", () => {
        const s = scope(
            { a: "string[]", b: "a[]", d: "definedInScope" },
            { scope: scope({ definedInScope: "boolean" }) }
        )
        attest(s.$.infer).typed as {
            a: string[]
            b: string[][]
            d: boolean
        }
    })
    // TODO: Reenable
    // test("errors on shallow cycle", () => {
    //     // @ts-expect-error
    //     attest(() => scope({ a: "a" })).throwsAndHasTypeError(
    //         shallowCycleMessage(["a", "a"])
    //     )
    //     attest(() =>
    //         // @ts-expect-error
    //         scope({ a: "b", b: "c", c: "a|b|c" })
    //     ).throwsAndHasTypeError(shallowCycleMessage(["a", "b", "c", "a"]))
    // })
})
