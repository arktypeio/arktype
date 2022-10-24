// @ts-nocheck TODO: Add a real snippet here
import { narrow, Narrow } from "@arktype/tools"
import { type } from "./src/index.js.js.js"
import type { TypeOptions } from "./src/type.js.js"

const type = {} as any
const io = {} as any

type UserInput = {
    name: string
    age?: number
}

type UserOut = {
    first: string
    last: string
    age?: number
}

const user = type({
    name: "string",
    age: "number?"
})

const newUser = user({ name: "David" })

// Should append semicolon for consistency with "meta" definition?
const user2 = type([
    { first: "string", last: "string", age: "number?" },
    "=>",
    { name: "string", age: "number?" },
    // Keys whose type does not change (and eventually those that can be auto-converted) should be optional to return
    ({ name }) => {
        const [first, last] = name.split(" ")
        return {
            first,
            last
        }
    }
])

const user3 = type(
    io(
        { name: "string", age: "number?" },
        { first: "string", last: "string", age: "number?" },
        ({ name }) => {
            const [first, last] = name.split(" ")
            return {
                first,
                last
            }
        }
    )
)

const user4 = type({
    age: "number?",
    name: io(
        "string",
        { first: "string", last: "string" },
        // Keys whose type does not change (and eventually those that can be auto-converted) should be optional to return
        (full) => {
            const [first, last] = full.split(" ")
            return {
                first,
                last
            }
        }
    )
})

const define = (def: unknown, options?: TypeOptions) => {}

const user7 = type({
    first: "string",
    last: "string",
    age: "number?",
    extras: define(
        { data: "unknown" },
        {
            errors: {
                extraneousKeys: true
            }
        }
    )
})

const user8 = type({
    first: "string",
    last: "string",
    age: "number?",
    extras: [
        { data: "unknown" },
        ";",
        {
            errors: {
                extraneousKeys: true
            }
        }
    ]
})

// TODO: Toplevel narrow
const user10 = type({
    first: "string",
    last: "string",
    age: "number?",
    extras: narrow({ data: "unknown" }, ({ data }) =>
        data === "isSomethingSpecific" ? undefined : "this is an error"
    )
})

// Output of above
const user11 = type({
    first: "string",
    last: "string",
    age: "number?",
    extras: [
        { data: "unknown" },
        // Meta operator as second item of tuple
        ";",
        {
            narrow: ({ data }) =>
                data === "isSomethingSpecific" ? undefined : "this is an error"
        }
    ]
})

// TODO: If meta token is second char of tuple, parse accordingly. Will include main operators plus ";" and "=>"
const meta = type({
    first: "string",
    last: "string",
    age: "number?",
    extras: ["string", "|", "boolean"],
    another: ["number", "[]"]
})
