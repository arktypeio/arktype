import { scope } from "../../src/scope.js"
import { attest } from "../attest/main.js"

suite("generic", () => {
    test("cyclic", () => {
        const types = scope({
            "box<t,u>": {
                box: "t|u"
            },
            bitBox: "box<0|1,bitBox>"
        }).compile()

        attest(types.bitBox).types.toString()
    })
})
