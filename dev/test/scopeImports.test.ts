import { suite, test } from "mocha"
import { scope } from "../../src/main.js"
import { writeDuplicateAliasesMessage } from "../../src/scope.js"
import { attest } from "../attest/main.js"
import { lazily } from "./utils.js"

suite("scope imports", () => {
    const parent0 = lazily(() => scope({ zero: "0" }).compile())
    const parent1 = lazily(() => scope({ one: "1" }).compile())

    test("single", () => {
        const imported = scope({ ...parent0 }).scope({
            a: "zero[]|true"
        })
        attest(imported.infer).typed as {
            a: 0[] | true
        }
    })

    test("multiple", () => {
        const imported = scope.imports(
            parent0,
            parent1
        )({
            a: "zero|one|false"
        })
        attest(imported.infer).typed as {
            a: 0 | 1 | false
        }
    })
    // test("duplicate alias", () => {
    //     attest(() =>
    //         scope(
    //             // @ts-expect-error
    //             { a: "string" },
    //             { imports: [scope({ a: "string" }).compile()] }
    //         ).compile()
    //     ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    // })
    // test("duplicate imported alias", () => {
    //     attest(() =>
    //         scope(
    //             {},
    //             {
    //                 // @ts-expect-error
    //                 imports: [
    //                     scope({ a: "string" }).compile(),
    //                     scope({ a: "string" }).compile()
    //                 ]
    //             }
    //         ).compile()
    //     ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    // })
})
