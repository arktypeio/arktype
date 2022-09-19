//import { type } from "../index.js"
import { narrow, Narrow } from "@re-/tools"

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

const user2 = type([
    "$io",
    { name: "string", age: "number?" },
    { first: "string", last: "string", age: "number?" },
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
        // Keys whose type does not change (and eventually those that can be auto-converted) should be optional to return
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
