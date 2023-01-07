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

// Arbitrary input/output types on morphs vs key names representing defined types

// TODO: Change to type to always attach directly to output,  still be chainable
// out name would be arbitrary, could make out a special case of to
// if data specified, just override existing data
// problems should not be used as a name

const user = type(
    {
        name: "string",
        age: "number"
    },
    {
        in: (s: string) => {
            return JSON.parse(s)
        },
        out: {
            main: (user): ValidatedUser => {
                return { ...user, isInternal: true }
            },
            string: (user) => {
                return JSON.stringify(user)
            },
            length: (user) => user.name.length,
            admin: (user: User) => ({ ...user, isAdmin: true })
        }
    }
)

const { string, problems } = user({ name: "David", age: 29 }).to("admin")

user.from("string", "fdsoifusahgo")

user.from("fdsoifusahgo")

user.data({ name: "David", age: 29 }).out
