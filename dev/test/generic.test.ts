import { scope } from "../../src/scope.js"
import { attest } from "../attest/main.js"

const lazily = <t extends object>(thunk: () => t): t => {
    let cached: any
    return new Proxy<t>({} as t, {
        get: (_, prop) => {
            if (!cached) {
                cached = thunk()
            }
            return cached[prop as keyof t]
        },
        set: (_, prop, value) => {
            if (!cached) {
                cached = thunk()
            }
            cached[prop] = value
            return true
        }
    })
}

suite("generic", () => {
    const types = lazily(() =>
        scope({
            "box<t,u>": {
                box: "t|u"
            },
            bitBox: "box<0|1,bitBox>"
        }).compile()
    )

    test("cyclic", () => {
        attest(types.bitBox).types.toString()
    })
    test("errors on missing args", () => {})
})
