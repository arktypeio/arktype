import { assert } from "@re-/assert"
import { create } from "@re-/model"
import { compile } from "../space.js"

describe("inheritable configs", () => {
    test("single ad hoc", () => {
        const user = create({ name: "string" })
        assert(
            user.validate(
                { name: "David Blass", age: 28 },
                { ignoreExtraneousKeys: true }
            ).errors
        ).is(undefined)
    })
    test("single from create options", () => {
        const user = create(
            { name: "string" },
            { validate: { ignoreExtraneousKeys: true } }
        )
        assert(user.validate({ name: "David Blass", age: 28 }).errors).is(
            undefined
        )
    })
    test("single from model config in space", () => {
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
    test("single from space config", () => {
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
})
