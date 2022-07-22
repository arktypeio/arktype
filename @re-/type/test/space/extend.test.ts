import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("extend space", () => {
    it("type", () => {
        const extended = getExtendedSpace()
        assert(extended.$meta.infer).typed as {
            user: {
                age: number
            }
            group: {
                members: {
                    age: number
                }[]
            }
            other: {
                users: {
                    age: number
                }[]
                groups: {
                    members: {
                        age: number
                    }[]
                }[]
            }
        }
    })
    it("dictionary", () => {
        const extended = getExtendedSpace()
        assert(extended.$meta.dictionary).snap({
            $meta: {
                onCycle: `boolean`
            },
            user: { age: `number` },
            group: { members: `user[]` },
            other: { users: `user[]`, groups: `group[]` }
        })
    })
    it("options", () => {
        const extended = getExtendedSpace()
        assert(extended.$meta.options).snap({
            validate: { ignoreExtraneousKeys: true },
            models: {
                user: { validate: { ignoreExtraneousKeys: false } },
                group: { generate: { onRequiredCycle: true } },
                other: { validate: { ignoreExtraneousKeys: true } }
            }
        })
    })
})

const getExtendedSpace = () => {
    const mySpace = space(
        {
            $meta: {
                onCycle: "number"
            },
            user: { name: "string" },
            group: { members: "user[]" }
        },
        {
            validate: { ignoreExtraneousKeys: true },
            models: {
                user: {
                    validate: {
                        ignoreExtraneousKeys: false
                    }
                }
            }
        }
    )
    const extended = mySpace.$meta.extend(
        {
            $meta: {
                onCycle: "boolean"
            },
            user: { age: "number" },
            other: { users: "user[]", groups: "group[]" }
        },
        {
            models: {
                group: {
                    generate: {
                        onRequiredCycle: true
                    }
                },
                other: {
                    validate: {
                        ignoreExtraneousKeys: true
                    }
                }
            }
        }
    )
    return extended
}
