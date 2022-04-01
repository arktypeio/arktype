import { assert } from "@re-/assert"
import { create, compile } from "@re-/model"
import { narrow } from "@re-/tools"

describe("inheritable configs", () => {
    describe("methods", () => {
        test("no config", () => {
            assert(
                create({ name: "string" }).validate({
                    name: "David Blass",
                    age: 28
                }).errors
            ).snap(`"Keys 'age' were unexpected."`)
        })
        test("ad hoc", () => {
            const user = create({ name: "string" })
            assert(
                user.validate(
                    { name: "David Blass", age: 28 },
                    { ignoreExtraneousKeys: true }
                ).errors
            ).is(undefined)
        })
        test("create options", () => {
            const user = create(
                { name: "string" },
                { validate: { ignoreExtraneousKeys: true } }
            )
            assert(user.validate({ name: "David Blass", age: 28 }).errors).is(
                undefined
            )
        })
        test("model config in space", () => {
            const user = compile(
                { user: { name: "string" } },
                {
                    models: {
                        user: { validate: { ignoreExtraneousKeys: true } }
                    }
                }
            ).create("user")
            assert(
                user.validate({
                    name: "David Blass",
                    age: 28
                }).errors
            ).is(undefined)
        })
        test("space config", () => {
            const user = compile(
                { user: { name: "string" } },
                {
                    validate: { ignoreExtraneousKeys: true }
                }
            ).create("user")
            assert(
                user.validate({
                    name: "David Blass",
                    age: 28
                }).errors
            ).is(undefined)
        })
        test("precedence", () => {
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
            // When options are not provided to the call, options provided to create win
            assert(doll.generate().contents).equals("create" as any)
            //When options are not provided to create, options model-specific config wins
            assert(nesting.create("doll").generate().contents).equals(
                "model" as any
            )
            //When no other options are provided, space config applies
            assert(
                compile(
                    { doll: { contents: "doll" } },
                    { generate: { onRequiredCycle: "space" } }
                ).models.doll.generate().contents
            ).equals({ contents: "space" } as any)
        })
    })
    describe("parse", () => {
        describe("types", () => {
            const resolutions = narrow({
                recursionIs: { recursionIs: "recursionIs" }
            })
            test("no config", () => {
                assert(create("recursionIs", { space: { resolutions } }).type)
                    .typed as {
                    recursionIs: {
                        recursionIs: any
                    }
                }
            })
            test("create config", () => {
                assert(
                    create("recursionIs", {
                        space: {
                            resolutions
                        },
                        parse: {
                            onCycle: "'create'"
                        }
                    }).type
                ).typed as {
                    recursionIs: "create"
                }
            })
            test("space config", () => {
                const space = compile(resolutions, {
                    parse: { onCycle: "'space'" }
                })
                assert(space.models.recursionIs.type).typed as {
                    recursionIs: "space"
                }
            })
            test("precedence", () => {
                const space = compile(resolutions, {
                    parse: { onCycle: "'space'" }
                })
                // When all three configs are provided, create call wins
                assert(
                    space.create("recursionIs", {
                        parse: { onCycle: "'create'" }
                    }).type
                ).typed as {
                    recursionIs: "create"
                }
                // Space has the least priority
                assert(space.create("recursionIs").type).typed as {
                    recursionIs: "space"
                }
            })
        })
    })
})
