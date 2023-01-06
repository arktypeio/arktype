// @ts-nocheck

import { scope, type } from "../api"

const date = type("Date", {
    from: {
        string: (s) => {
            return new Date(s)
        }
    },
    to: {
        string: (d: Date) => {
            return d.toString()
        }
    }
})

const user = type(
    {
        name: "string",
        age: "number"
    },
    {
        from: {
            string: (s) => {
                return JSON.parse(s)
            }
        },
        to: (user): InternalUser => {
            return { ...user }
        }
        // to: {
        //     string: (user) => {
        //         return JSON.stringify(user)
        //     },
        //     length: (user) => user.name.length,
        //     validate: (user): InternalUser => {
        //         return { ...user }
        //     }
        // }
    }
)

const { data } = user.check({})
// OR
const { data } = user({}).to("validatedUser")

const { data } = user({}).to()

// e.g. from accepts UserInput
const userData = user.from({})

// There is some "string input", and a definition for how it is transformed
// What is the type of Data
// Maybe there are some morphs for outgoing types
const { data, problems } = date.from("string", "5/12/2023")

// Arbitrary input/output types on morphs vs key names representing defined types

const $ = scope({
    dateString: "string",
    date: type("Date", {
        from: {
            string: "parseDate"
        }
    }),
    parseDate: ["string", "=>", (s) => new Date(s)]
})
