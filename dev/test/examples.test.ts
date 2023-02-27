import { describe, it } from "mocha"
import { attest } from "../attest/main.ts"

describe("snippets", () => {
    it("demo", async () => {
        const typeSnippet = await import("../examples/demo.ts")
        attest(typeSnippet.pkg.infer).typed as {
            name: string
            version: string
            contributors?: string[]
        }
        attest(typeSnippet.problems?.summary).snap(
            "contributors must be more than 1 items long (was 1)"
        )
    })
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
            "device/platform must be 'android' or 'ios' (was 'enigma')"
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
            "dependencies/0/dependencies/0/contributors/0/email must be a valid email (was 'david@sharktypeio')\ncontributors/0/email must be a valid email (was 'david@sharktypeio')"
        )
    })
})
