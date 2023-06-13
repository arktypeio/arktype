import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

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
        attest(disappointingGift.allows.toString())
            .snap(`function anonymous($arkRoot
) {
const self = ($arkRoot) => {
                return ((typeof $arkRoot === "object" && $arkRoot !== null) || typeof $arkRoot === "function") && typeof $arkRoot.label === "string" && !('box' in $arkRoot) || ((typeof $arkRoot.box === "object" && $arkRoot.box !== null) || typeof $arkRoot.box === "function") && self($arkRoot.box)
            }
            return self($arkRoot)
}`)
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
