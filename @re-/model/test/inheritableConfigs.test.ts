import { assert } from "@re-/assert"
import { compile, model } from "#src"

describe("inheritable configs", () => {
    describe("methods", () => {
        it("no config", () => {
            assert(
                model({ name: "string" }).validate({
                    name: "David Blass",
                    age: 28
                }).error
            ).snap(`Keys 'age' were unexpected.`)
        })
        it("ad hoc", () => {
            const user = model({ name: "string" })
            assert(
                user.validate(
                    { name: "David Blass", age: 28 },
                    { ignoreExtraneousKeys: true }
                ).error
            ).is(undefined)
        })
        it("create options", () => {
            const user = model(
                { name: "string" },
                { validate: { ignoreExtraneousKeys: true } }
            )
            assert(user.validate({ name: "David Blass", age: 28 }).error).is(
                undefined
            )
        })
        it("model config in space", () => {
            const space = compile(
                { user: { name: "string" } },
                {
                    models: {
                        user: { validate: { ignoreExtraneousKeys: true } }
                    }
                }
            )
            assert(
                space.models.user.validate({
                    name: "David Blass",
                    age: 28
                }).error
            ).is(undefined)
        })
        it("space config", () => {
            const space = compile(
                { user: { name: "string" } },
                {
                    validate: { ignoreExtraneousKeys: true }
                }
            )
            assert(
                space.models.user.validate({
                    name: "David Blass",
                    age: 28
                }).error
            ).is(undefined)
        })
        it("precedence", () => {
            const nesting = compile(
                { doll: { contents: "doll" } },
                {
                    generate: { onRequiredCycle: "space" },
                    models: {
                        doll: { generate: { onRequiredCycle: "model" } }
                    }
                }
            )
            const doll = nesting.create("doll", {
                generate: { onRequiredCycle: "create" }
            })
            // When all four are provided, the options provided to the call win
            assert(
                doll.generate({ onRequiredCycle: "generate" }).contents
            ).equals("generate" as any)
            // When no args are provided, options model-specific config wins
            assert(nesting.create("doll").generate().contents).equals(
                "model" as any
            )
            // When no model-specific config is provided, space config applies
            assert(
                compile(
                    { doll: { contents: "doll" } },
                    { generate: { onRequiredCycle: "space" } }
                ).models.doll.generate()
            ).equals({ contents: "space" } as any)
            // When there is no other config, create options will apply
            assert(
                compile({ doll: { contents: "doll" } })
                    .create("doll", { generate: { onRequiredCycle: "create" } })
                    .generate().contents
            ).equals("create" as any)
        })
    })
})
