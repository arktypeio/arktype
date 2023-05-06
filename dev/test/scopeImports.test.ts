import { suite, test } from "mocha"
import { scope } from "../../src/main.js"
import { writeDuplicateAliasesMessage } from "../../src/scope.js"
import { attest } from "../attest/main.js"

suite("scope imports", () => {
    test("imports/includes", () => {
        const parent = scope({ definedInParent: "boolean" }).compile()
        const aliases = {
            reference: "definedInParent"
        } as const
        const imported = scope(aliases, { imports: [parent] })
        attest(imported.infer).typed as {
            reference: boolean
        }
        const included = scope(aliases, { includes: [parent] })
        attest(included.infer).typed as {
            reference: boolean
            definedInParent: boolean
        }
        const importedTypes = imported.compile()
        // attest(importedTypes.reference.node).equals({ boolean: true })
        // attest((importedTypes as any).definedInParent).equals(undefined)
        // const includedTypes = included.compile()
        // attest(importedTypes.reference.node).equals({ boolean: true })
        // attest(includedTypes.definedInParent.node).snap({ boolean: true })
    })
    test("duplicate alias", () => {
        attest(() =>
            scope(
                // @ts-expect-error
                { a: "string" },
                { includes: [scope({ a: "string" }).compile()] }
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
    test("duplicate included alias", () => {
        attest(() =>
            scope(
                {},
                {
                    // @ts-expect-error
                    includes: [
                        scope({ a: "string" }).compile(),
                        scope({ a: "string" }).compile()
                    ]
                }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
    test("duplicate between includes and imports", () => {
        attest(() =>
            scope(
                {},
                {
                    imports: [scope({ a: "string" }).compile()],
                    // @ts-expect-error
                    includes: [scope({ a: "string" }).compile()]
                }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
})
