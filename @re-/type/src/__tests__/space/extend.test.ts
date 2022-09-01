import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { def, space } from "../../index.js"

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
                // @ts-expect-error (values returned from def() don't match their declared types by design)
                $def: { members: `user[]` },
                $opts: { validate: { ignoreExtraneousKeys: false } }
            },
            other: {
                // @ts-expect-error
                $def: { users: `user[]`, groups: `group[]` },
                $opts: { validate: { ignoreExtraneousKeys: true } }
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
                ignoreExtraneousKeys: false,
                // @ts-expect-error (can't serialize function)
                validator: `<function validator>`
            }
        })
    })
})

const getExtendedSpace = () => {
    const mySpace = space(
        {
            user: { name: "string" },
            group: def(
                { members: "user[]" },
                {
                    validate: {
                        ignoreExtraneousKeys: false
                    }
                }
            )
        },
        {
            parse: {
                onCycle: "number"
            },
            validate: { ignoreExtraneousKeys: true, validator: () => undefined }
        }
    )
    const extended = mySpace.$root.extend(
        {
            user: { first: "string", last: "string" },
            other: def(
                { users: "user[]", groups: "group[]" },
                {
                    validate: {
                        ignoreExtraneousKeys: true
                    }
                }
            )
        },
        {
            parse: {
                onCycle: "boolean"
            },
            validate: {
                ignoreExtraneousKeys: false
            }
        }
    )
    return extended
}
