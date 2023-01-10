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

const user = type({
    name: "string",
    birthday: "Date"
})

const $ = scope({
    // implementation is string=>unknown, inferred as string=>Date
    date: ["string=>Date", () => {}],
    // implementation unknown=>unknown, inferred as unknown=>Date
    date2: ["=>Date"],
    // implementation string=>Date, inferred as string=>Date
    date3: ["string=>"],
    // implementation unknown=>Date, inferred as unknown=>Date
    date4: ["=>"]
})

// &, | work same

// input: a & (b=>c)
// output: (a&b)=>c

// input: (a=>b) & (c=>d)
// output: Error: Operation between two morphs... try |> instead

// input: (a=>b) |> (c=>d)
// output:
//   if b is a subtype of c:
//     (a => d)
//   else:
//     error: b is not assignable to c
// EZ MOOOCHI
