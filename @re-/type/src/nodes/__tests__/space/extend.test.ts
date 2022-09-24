import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { define, space } from "../../../index.js"

describe("extend space", () => {
    test("type", () => {
        const extended = getExtendedSpace()
        assert(extended.$root.infer).typed as {
            user: {
                first: string
                last: string
            }
            group: {
                members: {
                    first: string
                    last: string
                }[]
            }
            other: {
                groups: {
                    members: {
                        first: string
                        last: string
                    }[]
                }[]
                users: {
                    first: string
                    last: string
                }[]
            }
        }
    })
    test("dictionary", () => {
        const extended = getExtendedSpace()
        assert(extended.$root.dictionary).snap({
            user: { first: `string`, last: `string` },
            group: {
                // @ts-expect-error (values returned from define() don't match their declared types by design)
                $def: { members: `user[]` },
                $opts: {
                    validate: {
                        diagnostics: { extraneousKeys: { enabled: true } }
                    }
                }
            },
            other: {
                // @ts-expect-error
                $def: { users: `user[]`, groups: `group[]` },
                $opts: {
                    validate: {
                        diagnostics: { extraneousKeys: { enabled: false } }
                    }
                }
            }
        })
    })
    test("options", () => {
        const extended = getExtendedSpace()
        assert(extended.$root.options).snap({
            parse: {
                onCycle: "boolean"
            },
            validate: {
                diagnostics: { extraneousKeys: { enabled: true } },
                validator: `<function validator>`
            }
        })
    })
})

const getExtendedSpace = () => {
    const mySpace = space(
        {
            user: { name: "string" },
            group: define(
                { members: "user[]" },
                {
                    validate: {
                        diagnostics: { extraneousKeys: { enabled: true } }
                    }
                }
            )
        },
        {
            parse: {
                onCycle: "number"
            },
            validate: {
                diagnostics: { extraneousKeys: { enabled: false } },
                validator: () => undefined
            }
        }
    )
    const extended = mySpace.$root.extend(
        {
            user: { first: "string", last: "string" },
            other: define(
                { users: "user[]", groups: "group[]" },
                {
                    validate: {
                        diagnostics: { extraneousKeys: { enabled: false } }
                    }
                }
            )
        },
        {
            parse: {
                onCycle: "boolean"
            },
            validate: {
                diagnostics: { extraneousKeys: { enabled: true } }
            }
        }
    )
    return extended
}
