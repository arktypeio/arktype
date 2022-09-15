import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { def, space, type } from "../../index.js"

describe("inheritable configs", () => {
    describe("methods", () => {
        test("no config", () => {
            assert(
                type({ name: "string" }).check({
                    name: "David Blass",
                    age: 28
                }).errors
            ).is(undefined)
        })
        test("ad hoc", () => {
            const user = type({ name: "string" })
            assert(
                user.check(
                    { name: "David Blass", age: 28 },
                    { diagnostics: { ExtraneousKeys: { enable: true } } }
                ).errors?.summary
            ).snap(`Keys age were unexpected.`)
        })
        test("type options", () => {
            const user = type(
                { name: "string" },
                {
                    validate: {
                        diagnostics: { ExtraneousKeys: { enable: true } }
                    }
                }
            )
            assert(
                user.check({ name: "David Blass", age: 28 }).errors?.summary
            ).equals(`Keys age were unexpected.`)
        })

        test("def config in space", () => {
            const mySpace = space({
                user: def(
                    { name: "string" },
                    {
                        validate: {
                            diagnostics: { ExtraneousKeys: { enable: true } }
                        }
                    }
                )
            })
            assert(
                mySpace.user.check({
                    name: "David Blass",
                    age: 28
                }).errors?.summary
            ).equals(`Keys age were unexpected.`)
        })
        test("space config", () => {
            const mySpace = space(
                { user: { name: "string" } },
                {
                    validate: {
                        diagnostics: { ExtraneousKeys: { enable: true } }
                    }
                }
            )
            assert(
                mySpace.user.check({
                    name: "David Blass",
                    age: 28
                }).errors?.summary
            ).equals(`Keys age were unexpected.`)
        })
        test("precedence", () => {
            const nesting = space(
                {
                    doll: def(
                        { contents: "doll" },
                        { create: { onRequiredCycle: "def" } }
                    )
                },
                {
                    create: { onRequiredCycle: "space" }
                }
            )
            const doll = nesting.$root.type("doll", {
                create: { onRequiredCycle: "type" }
            })
            // When all four are provided, the options provided to the call win
            assert(
                doll.create({ onRequiredCycle: "create" }).contents
            ).unknown.equals("create")
            // When no args are provided, options def config wins
            assert(nesting.$root.type("doll").create().contents).unknown.equals(
                "def"
            )
            // When no type-specific config is provided, space config applies
            assert(
                space(
                    { doll: { contents: "doll" } },
                    { create: { onRequiredCycle: "space" } }
                ).doll.create()
            ).unknown.equals({ contents: "space" })
            // When there is no other config, create options will apply
            assert(
                space({ doll: { contents: "doll" } })
                    .$root.type("doll", {
                        create: { onRequiredCycle: "create" }
                    })
                    .create().contents
            ).unknown.equals("create")
        })
    })
})
