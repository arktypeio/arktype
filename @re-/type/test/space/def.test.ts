import { assert } from "@re-/assert"
import { def, space } from "../../src/index.js"

const getSpace = () =>
    space({
        user: def(
            {
                name: "name"
            },
            { validate: { ignoreExtraneousKeys: true } }
        ),
        group: def({
            members: "user[]"
        }),
        name: {
            first: "string",
            last: "string"
        }
    })

describe("defz", () => {
    it("doesn't change the type of string defs", () => {
        const types = getSpace()
        assert(types.$root.infer).typed as {
            user: {
                name: {
                    first: string
                    last: string
                }
            }
            group: {
                members: {
                    name: {
                        first: string
                        last: string
                    }
                }[]
            }
            name: {
                first: string
                last: string
            }
        }
    })
    it("applies type-specific options", () => {
        const types = getSpace()
        const name = { first: "tsrif", last: "tsal" }
        const age = 27
        const validUserWithExtraKey = {
            name,
            age
        }
        const invalidPropSwappedUser = {
            name: age,
            age: name
        }
        assert(types.user.validate(validUserWithExtraKey).data).value.equals(
            validUserWithExtraKey
        ).typed as
            | {
                  name: {
                      first: string
                      last: string
                  }
              }
            | undefined
        assert(
            types.group.validate({
                members: [validUserWithExtraKey, invalidPropSwappedUser],
                // No extraneous keys is not specified for group, so description is not allowed
                description: "Typescript Devs"
            }).error?.message
        ).snap()
    })
})
