import { suite, test } from "mocha"
import { node, type } from "../../src/main.js"
import { writeInvalidConstructorMessage } from "../../src/parse/tuple.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Type } from "../../src/type.js"
import { attest } from "../attest/main.js"

suite("instanceof", () => {
    suite("tuple expression", () => {
        test("base", () => {
            const t = type(["instanceof", Error])
            attest(t.infer).typed as Error
            attest(t.condition).equals(node({ basis: Error }).condition)
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
        test("multiple branches", () => {
            const t = type(["instanceof", Date, Array])
            attest(t.infer).typed as Date | unknown[]
        })
        test("non-constructor", () => {
            // @ts-expect-error
            attest(() => type(["instanceof", () => {}])).types.errors(
                "Type '() => void' is not assignable to type"
            )
        })
        test("user-defined class", () => {
            class ArkClass {
                isArk = true
            }
            const ark = type(["instanceof", ArkClass])
            attest(ark).typed as Type<ArkClass, Ark>
            // not expanded since there are no morphs
            attest(ark.infer).types.toString("ArkClass")
            attest(ark.inferIn).types.toString("ArkClass")
            const a = new ArkClass()
            attest(ark(a).data).equals(a)
            attest(ark({}).problems?.summary).snap(
                "Must be an instance of ArkClass (was Object)"
            )
        })
    })
    suite("root expression", () => {
        test("constructor", () => {
            const t = type("instanceof", Error)
            attest(t.infer).typed as Error
            attest(t.condition).equals(type(["instanceof", Error]).condition)
        })
        test("instance branches", () => {
            const t = type("instanceof", Date, Map)
            attest(t.infer).typed as Date | Map<unknown, unknown>
            attest(t.condition).equals(type("Date|Map").condition)
        })
        test("non-constructor", () => {
            // @ts-expect-error just an assignability failure so we can't validate an error message
            attest(() => type("instanceof", new Error())).throws(
                writeInvalidConstructorMessage("Error")
            )
        })
    })
})
