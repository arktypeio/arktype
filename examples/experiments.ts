// @ts-nocheck
/* eslint-disable */

import { type } from "../api"
import { evaluate } from "../src/utils/generics"

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
            out: (user): ValidatedUser => {
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
const { string, admin, out, data, problems } = user({ name: "David", age: 29 })

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

type overlaps<t, u> = t & u extends never ? false : t & u

type Z = overlaps<{ a?: boolean }, { a?: "foo" }>

type Zzzz = evaluate<{ a: string } & { a: number }>

const $ = scope({
    user: {
        name: "string",
        birthday: "date"
    },
    person: {
        birthday: ["string=>", (s) => new Date(s)]
    },
    date: ["Date", "|", ["string=>", (s) => new Date(s)]],
    newType: "user|>person"
})

type ZZ = {
    (n: number): string
    (s: string): string
}

const z: ZZ = (n) => n

const $ = scope({
    // implementation is string=>unknown, inferred as unknown=>Date
    date: ["string=>Date", () => {}],
    // implementation unknown=>unknown, inferred as unknown=>Date
    date2: ["=>Date"],
    // implementation string=>Date, inferred as unknown=>Date
    date3: ["string=>"],
    // implementation unknown=>Date, inferred as unknown=>Date;
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
