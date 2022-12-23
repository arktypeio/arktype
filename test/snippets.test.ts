import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"

describe("snippets", () => {
    test("type", async () => {
        const typeSnippet = await import("../examples/type.js")
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
        const scopeSnippet = await import("../examples/scope.js")
        attest(scopeSnippet.types.package.infer).type.toString.snap(
            "{ name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }"
        )
        attest(scopeSnippet.problems?.summary)
            .snap(`dependencies/0/contributors: contributors is required
contributors/0/email: Must be a valid email (was "david@araktypeio")`)
    })
})
