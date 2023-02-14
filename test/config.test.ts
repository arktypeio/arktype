import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("config traversal", () => {
    it("tuple expression", () => {
        const mustBe = "a series of characters"
        const types = scope({
            a: ["string", ":", { mustBe }],
            b: {
                a: "a"
            }
        }).compile()
        attest(types.a.infer).typed as string
        attest(types.a.meta.config).equals({
            defaults: { mustBe }
        })
        attest(types.a.flat).equals([
            [
                "config",
                {
                    config: { defaults: { mustBe } },
                    node: "string"
                }
            ]
        ])

        attest(types.a(1).problems?.summary).snap(
            "Must be a series of characters (was number)"
        )

        attest(types.b.infer).typed as { a: string }
        attest(types.b.flat).equals([
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
                                    defaults: { mustBe }
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

    it("tuple expression at path", () => {
        const t = type({
            monster: [
                "196883",
                ":",
                {
                    mustBe: "the number of dimensions in the monster group"
                }
            ]
        })
        attest(t.infer).typed as { monster: 196883 }
        attest(t.node).snap({ object: { props: { monster: "monster" } } })
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "requiredProp",
                [
                    "monster",
                    [
                        [
                            "config",
                            {
                                config: {
                                    defaults: {
                                        mustBe: "the number of dimensions in the monster group"
                                    }
                                },
                                node: [["value", 196883]]
                            }
                        ]
                    ]
                ]
            ]
        ])
        attest(t({ monster: 196882 }).problems?.summary).snap(
            "monster must be the number of dimensions in the monster group (was 196882)"
        )
    })
})
