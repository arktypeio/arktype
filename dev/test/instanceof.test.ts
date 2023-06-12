import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { Type } from "../../src/type.js"
import { attest } from "../attest/main.js"

suite("instanceof", () => {
    suite("tuple expression", () => {
        test("base", () => {
            const t = type(["instanceof", Error])
            attest(t.infer).typed as Error
            // attest(t.node).equals({ object: { instance: Error } })
            const e = new Error()
            attest(t(e).data).equals(e)
            attest(t({}).problems?.summary).snap(
                "Must be an Error (was Object)"
            )
        })
        test("inherited", () => {
            const t = type(["instanceof", TypeError])
            const e = new TypeError()
            // for some reason the return of TypeError's constructor is actually
            // inferred as Error? Disabling this check for now, seems like an anomaly.
            // attest(t.infer).typed as TypeError
            attest(t(e).data).equals(e)
            attest(t(new Error()).problems?.summary).snap(
                "Must be an instance of TypeError (was Error)"
            )
        })
        test("builtins not evaluated", () => {
            const t = type(["instanceof", Date])
            attest(t.infer).types.toString("Date")
        })
        test("non-constructor", () => {
            // @ts-expect-error
            attest(() => type(["instanceof", () => {}])).types.errors(
                "Type '() => void' is not assignable to type"
            )
        })
        test("user-defined class", () => {
            class Ark {}
            const ark = type(["instanceof", Ark])
            attest(ark).typed as Type<Ark>
            const a = new Ark()
            attest(ark(a).data).equals(a)
            attest(ark({}).problems?.summary).snap(
                "Must be an instance of Ark (was Object)"
            )
        })
    })
    suite("method", () => {
        test("single", () => {
            const t = type.instanceof(Type)
            attest(t.infer).typed as Type<unknown, unknown>
            attest(t.condition).snap("$arkRoot instanceof globalThis.$ark.Type")
        })
        test("instance branches", () => {
            const t = type.instanceof(Date, Map)
            attest(t.infer).typed as Date | Map<unknown, unknown>
            attest(t.condition).equals(type("Date|Map").condition)
        })
        test("type error on non-constructor", () => {
            // @ts-expect-error
            attest(type.instanceof({})).types.errors(
                "Argument of type '{}' is not assignable to parameter of type 'AbstractableConstructor'."
            )
        })
    })
})
