import { describe, it } from "mocha"
import { attest } from "../dev/attest/api.ts"

describe("snippets", () => {
    it("type", async () => {
        const typeSnippet = await import("../examples/type.ts")
        attest(typeSnippet.user.infer).typed as {
            name: string
            device: {
                platform: "android" | "ios"
                version?: number
            }
        }
        attest(typeSnippet.problems?.summary).snap(
            '"enigma" does not satisfy any branches'
        )
    })
    it("scope", async () => {
        const scopeSnippet = await import("../examples/scope.ts")
        attest(scopeSnippet.types.package.infer).typed as {
            name: string
            dependencies?: any[]
            devDependencies?: any[]
            contributors?: {
                email: string
                packages?: any[]
            }[]
        }
        attest(scopeSnippet.problems?.summary).snap(
            'devDependencies/0/dependencies/0/contributors/0/email: "david@sharktypeio" must match expression /^(.+)@(.+)\\.(.+)$/\ncontributors/0/email: "david@sharktypeio" must match expression /^(.+)@(.+)\\.(.+)$/'
        )
    })
})
