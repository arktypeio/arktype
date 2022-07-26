import { assert } from "@re-/assert"
import { describe, test } from "vitest"
import { def, space, type } from "../../src/index.js"

describe("inheritable configs", () => {
    describe("methods", () => {
        test("no config", () => {
            assert(
                type({ name: "string" }).validate({
                    name: "David Blass",
                    age: 28
                }).error?.message
            ).snap(`Keys 'age' were unexpected.`)
        })
        test("ad hoc", () => {
            const user = type({ name: "string" })
            assert(
                user.validate(
                    { name: "David Blass", age: 28 },
                    { ignoreExtraneousKeys: true }
                ).error
            ).is(undefined)
        })
        test("type options", () => {
            const user = type(
                { name: "string" },
                { validate: { ignoreExtraneousKeys: true } }
            )
            assert(user.validate({ name: "David Blass", age: 28 }).error).is(
                undefined
            )
        })

        test("def config in space", () => {
            const mySpace = space({
                user: def(
                    { name: "string" },
                    { validate: { ignoreExtraneousKeys: true } }
                )
            })
            assert(
                mySpace.user.validate({
                    name: "David Blass",
                    age: 28
                }).error
            ).is(undefined)
        })
        test("space config", () => {
            const mySpace = space(
                { user: { name: "string" } },
                {
                    validate: { ignoreExtraneousKeys: true }
                }
            )
            assert(
                mySpace.user.validate({
                    name: "David Blass",
                    age: 28
                }).error
            ).is(undefined)
        })
        test("precedence", () => {
            const nesting = space(
                {
                    doll: def(
                        { contents: "doll" },
                        { generate: { onRequiredCycle: "def" } }
                    )
                },
                {
                    generate: { onRequiredCycle: "space" }
                }
            )
            const doll = nesting.$root.type("doll", {
                generate: { onRequiredCycle: "type" }
            })
            // When all four are provided, the options provided to the call win
            assert(
                doll.create({ onRequiredCycle: "create" }).contents
            ).value.equals("create")
            // When no args are provided, options def config wins
            assert(nesting.$root.type("doll").create().contents).value.equals(
                "def"
            )
            // When no type-specific config is provided, space config applies
            assert(
                space(
                    { doll: { contents: "doll" } },
                    { generate: { onRequiredCycle: "space" } }
                ).doll.create()
            ).value.equals({ contents: "space" })
            // When there is no other config, create options will apply
            assert(
                space({ doll: { contents: "doll" } })
                    .$root.type("doll", {
                        generate: { onRequiredCycle: "create" }
                    })
                    .create().contents
            ).value.equals("create")
        })
    })
})
