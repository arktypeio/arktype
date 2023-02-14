import { describe, it } from "mocha"
import { scope } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("config traversal", () => {
    it("tuple expression", () => {
        const types = scope({
            a: ["string", ":", { mustBe: () => "a series of characters" }],
            b: {
                a: "a"
            }
        }).compile()
        attest(types.a.infer).typed as string
        attest(types.a.meta.config).snap({
            defaults: { mustBe: "(function mustBe)" }
        })
        attest(types.a.flat).snap([
            [
                "config",
                {
                    config: { defaults: { mustBe: "(function mustBe)" } },
                    node: "string"
                }
            ]
        ])

        attest(types.a(1).problems?.summary).snap(
            "Must be a series of characters (was number)"
        )

        attest(types.b.infer).typed as { a: string }
        attest(types.b.flat).snap([
            ["domain", "object"],
            [
                "requiredProp",
                [
                    "a",
                    [
                        [
                            "config",
                            {
                                config: {
                                    defaults: { mustBe: "(function mustBe)" }
                                },
                                node: "string"
                            }
                        ]
                    ]
                ]
            ]
        ])

        attest(types.b({ a: true }).problems?.summary).snap(
            "a must be a series of characters (was boolean)"
        )
    })
})
