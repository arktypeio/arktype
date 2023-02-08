import { describe, it } from "mocha"
import { scope } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeDuplicateAliasesMessage } from "../src/scopes/scope.ts"

describe("scope imports", () => {
    it("imports/includes", () => {
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
        attest(importedTypes.reference.node).equals({ boolean: true })
        attest((importedTypes as any).definedInParent).equals(undefined)
        const includedTypes = included.compile()
        attest(importedTypes.reference.node).equals({ boolean: true })
        attest(includedTypes.definedInParent.node).snap({ boolean: true })
    })
    it("duplicate alias", () => {
        attest(() =>
            scope(
                // @ts-expect-error
                { a: "string" },
                { includes: [scope({ a: "string" }).compile()] }
            ).compile()
        ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
    })
    it("duplicate imported alias", () => {
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
    it("duplicate included alias", () => {
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
    it("duplicate between includes and imports", () => {
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
