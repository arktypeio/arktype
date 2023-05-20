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
        const imported = scope({ ...parent0, ...parent1 }).scope({
            a: "zero|one|false"
        })
        attest(imported.infer).typed as {
            a: 0 | 1 | false
        }
    })

    test("named", () => {
        const imported = scope({ parent0, ...parent1 }).scope({
            a: "parent0.zero|one|false"
        })
        attest(imported.infer).typed as {
            a: 0 | 1 | false
        }
    })
    test("duplicate alias", () => {
        attest(() =>
            scope({ a: "boolean" })
                .scope(
                    // @ts-expect-error
                    { a: "string" }
                )
                .compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
})
