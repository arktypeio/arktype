import { suite, test } from "mocha"
import { scope } from "../../src/main.js"
import { writeDuplicateAliasesMessage } from "../../src/scope.js"
import { attest } from "../attest/main.js"

suite("scope imports", () => {
    test("imports/includes", () => {
        const parent = scope({ definedInParent: "boolean" }).compile()
        const imported = scope(
            {
                reference: "definedInParent"
            },
            { imports: [parent] }
        )
        attest(imported.infer).typed as {
            reference: boolean
        }
        const extended = scope(
            {
                reference: "definedInParent"
            },
            { extends: [parent] }
        )
        attest(extended.infer).typed as {
            reference: boolean
            definedInParent: boolean
        }
    })
    test("duplicate alias", () => {
        attest(() =>
            scope(
                // @ts-expect-error
                { a: "string" },
                { extends: [scope({ a: "string" }).compile()] }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
    test("duplicate imported alias", () => {
        attest(() =>
            scope(
                {},
                {
                    // @ts-expect-error
                    imports: [
                        scope({ a: "string" }).compile(),
                        scope({ a: "string" }).compile()
                    ]
                }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
    test("duplicate extended alias", () => {
        attest(() =>
            scope(
                {},
                {
                    // @ts-expect-error
                    extends: [
                        scope({ a: "string" }).compile(),
                        scope({ a: "string" }).compile()
                    ]
                }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
    test("duplicate between extends and imports", () => {
        attest(() =>
            scope(
                {},
                {
                    imports: [scope({ a: "string" }).compile()],
                    // @ts-expect-error
                    extends: [scope({ a: "string" }).compile()]
                }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
})
