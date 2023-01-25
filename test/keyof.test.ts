import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
type z = keyof Function
describe("instanceof", () => {
    it("base", () => {
        const t = type(["keyof", { a: "123", b: 123 }])
        attest(t.node).snap()
        // const e = new Error()
        // attest(t(e).data).equals(e)
        // attest(t({}).problems?.summary).snap(
        //     "Must be an instance of Error (was Object)"
        // )
    })
    // it("inherited", () => {
    // const t = type(["keyof", TypeError])
    //     const e = new TypeError()
    //     attest(t(e).data).equals(e)
    //     attest(t(new Error()).problems?.summary).snap(
    //         "Must be an instance of TypeError (was Error)"
    //     )
    // })
    // it("non-constructor", () => {
    //     // @ts-expect-error
    //     attest(() => type(["instanceof", () => {}])).type.errors(
    //         "Type '() => void' is not assignable to type 'constructor'"
    //     )
    // })
})
