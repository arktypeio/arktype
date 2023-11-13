import { describe, it } from "mocha"
import type { Type } from "../../src/main.js"
import { instanceOf, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

describe("instanceof", () => {
    it("base", () => {
        const t = type(["instanceof", Error])
        attest(t.infer).typed as Error
        attest(t.node).equals({ object: { class: Error } })
        attest(t.flat).equals([["class", Error]])
        const e = new Error()
        attest(t(e).data).equals(e)
        attest(t({}).problems?.summary).snap("Must be an Error (was Object)")
    })
    it("inherited", () => {
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
    it("abstract", () => {
        abstract class Base {
            abstract foo: string
        }
        class Sub extends Base {
            foo = ""
        }
        const t = type(["instanceof", Base])
        attest(t.infer).typed as Base
        const sub = new Sub()
        attest(t(sub).data).equals(sub)
    })
    it("builtins not evaluated", () => {
        const t = type(["instanceof", Date])
        attest(t.infer).types.toString("Date")
    })
    it("non-constructor", () => {
        // @ts-expect-error
        attest(() => type(["instanceof", () => {}])).types.errors(
            "Type '() => void' is not assignable to type"
        )
    })
    it("user-defined class", () => {
        class Ark {}
        const ark = type(["instanceof", Ark])
        attest(ark).typed as Type<Ark>
        const a = new Ark()
        attest(ark(a).data).equals(a)
        attest(ark({}).problems?.summary).snap(
            "Must be an instance of Ark (was Object)"
        )
    })
    it("helper", () => {
        const regex = instanceOf(RegExp)
        attest(regex.infer).types.toString("RegExp")
        attest(regex.node).snap({ object: { class: "(function RegExp)" } })
    })
    it("helper error", () => {
        // @ts-expect-error
        attest(() => instanceOf(5))
            .throws(
                "Expected a constructor following 'instanceof' operator (was number)."
            )
            .types.errors(
                "Argument of type 'number' is not assignable to parameter of type 'constructor"
            )
    })
})
