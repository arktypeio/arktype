// @ts-nocheck
/* eslint-disable */

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
            return { ...user, isInternal: true }
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

// e.g. from accepts UserInput
const { data, problems } = user({})

user.from("string", '{"name": "David", "age": 29}')

const { data } = user({ name: "David", age: 29 })

// There is some "string input", and a definition for how it is transformed
// What is the type of Data
// Maybe there are some morphs for outgoing types
const { data, problems } = date.from("string", "5/12/2023")

// Arbitrary input/output types on morphs vs key names representing defined types

const user = type(
    {
        name: "string",
        age: "number"
    },
    {
        in: (s: string) => {
            return JSON.parse(s)
        },
        out: (user): ValidatedUser => {
            return { ...user, isInternal: true }
        },
        to: {
            string: (user) => {
                return JSON.stringify(user)
            },
            length: (user) => user.name.length,
            admin: (user: User) => ({ ...user, isAdmin: true })
        }
    }
)

type User = typeof user.infer

const { out, data, problems } = user({ name: "David", age: 29 })

const { data, problems } = user({ name: "David", age: 29 }).to("formattedUser")
const { data, problems } = user({ name: "David", age: 29 }).outTo(
    "formattedUser"
)
// user.check()

user({ name: "David", age: 29 }).to("admin").to("string")

// TODO: Change to type to always attach directly to output,  still be chainable
// out name would be arbitrary, could make out a special case of to
// if data specified, just override existing data
// problems should not be used as a name
