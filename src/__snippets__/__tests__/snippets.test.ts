import { attest } from "@arktype/test"
import { describe, test } from "mocha"

describe("snippets", () => {
    test("type", async () => {
        const typeSnippet = await import("../type.js")
        attest(typeSnippet.user.infer).typed as {
            name: string
            browser: {
                kind: "chrome" | "firefox" | "safari"
                version?: number | undefined
            }
        }
        attest(typeSnippet.problems?.summary).snap(
            `browser/kind must be one of 'chrome'|'firefox'|'safari' (was "Internet Explorer")`
        )
    })
    test("scope", async () => {
        const scopeSnippet = await import("../scope.js")
        attest(scopeSnippet.types.package.infer).type.toString.snap(
            "{ name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }"
        )
        attest(scopeSnippet.problems?.summary)
            .snap(`dependencies/0/contributors: contributors is required
contributors/0/email: Must be a valid email (was "david@araktypeio")`)
    })
    test("constraints", async () => {
        const constraintsSnippet = await import("../constraints.js")
        attest(constraintsSnippet.problems?.summary)
            .snap(`email: Must match expression /[a-z]*@arktype.io/ (was "david@arktype.biz")
about/age: Must be at least 18 (was 17)
about/bio: Must be at most 80 characters (was 110)`)
        attest(constraintsSnippet.employee.infer).typed as {
            email: string
            about: {
                age: number
                bio: string
            }
        }
    })
})
