// @ts-nocheck
/* eslint-disable */

import { type } from "../api"

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

// All out morphs are attached alongside data
const { string, data, problems } = user({ name: "David", age: 29 })

// "to" function can be used for chaining
const { string, problems } = user({ name: "David", age: 29 }).to("admin")

// Input if multiple named inputs are specified
user.from("string", '{"name": "David", "age": 29}')

// Default input ("in" key if named morphs)
user.from('{"name": "David", "age": 29}')

// Access out morphs on prevalidated data
user.data({ name: "David", age: 29 }).out
