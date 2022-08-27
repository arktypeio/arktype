import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { def, space } from "../../index.js"

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

describe("def", () => {
    test("doesn't change the type of string defs", () => {
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
    test("applies type-specific options", () => {
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
        assert(types.user.check(validUserWithExtraKey).data).unknown.equals(
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
            types.group.check({
                members: [validUserWithExtraKey, invalidPropSwappedUser],
                // No extraneous keys is not specified for group, so description is not allowed
                description: "Typescript Devs"
            }).error?.message
        ).snap(`Encountered errors at the following paths:
  members/1/name: 27 is not assignable to {
    first: string,
    last: string
}.
  /: Keys 'description' were unexpected.
`)
    })
})
