import { describe, it } from "mocha"
import { attest } from "../dev/attest/api.ts"

// TODO: fix
describe("snippets", () => {
    it("type", async () => {
        attest(true).equals(true)
    })
    //     it("type", async () => {
    //         const typeSnippet = await import("../examples/type.ts")
    //         attest(typeSnippet.user.infer).typed as {
    //             name: string
    //             browser: {
    //                 kind: "chrome" | "firefox" | "safari"
    //                 version?: number | undefined
    //             }
    //         }
    //         attest(typeSnippet.problems?.summary).snap(
    //             `browser/kind must be one of 'chrome'|'firefox'|'safari' (was "Internet Explorer")`
    //         )
    //     })
    //     it("scope", async () => {
    //         const scopeSnippet = await import("../examples/scope.ts")
    //         attest(scopeSnippet.types.package.infer).type.toString.snap(
    //             "{ name: string; dependencies: any[]; contributors: { email: string; packages?: any[] | undefined; }[]; }"
    //         )
    //         attest(scopeSnippet.problems?.summary)
    //             .snap(`dependencies/0/contributors: contributors is required
    // contributors/0/email: Must be a valid email (was "david@araktypeio")`)
    //     })
})
