// @ts-nocheck
/* eslint-disable */

import { type } from "../api"
import { evaluate } from "../src/utils/generics"

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

// could also use syntax like ["string", (s)=>{...}, "Date"], if it doesn't break inference

const $ = scope({
    // implementation is string=>unknown, inferred as unknown=>Date
    date: ["string=>Date", (s) => new Date(s)],
    // implementation unknown=>unknown, inferred as unknown=>Date
    date2: ["=>Date"],
    // implementation string=>Date, inferred as unknown=>Date
    date3: ["string=>"],
    // implementation unknown=>Date, inferred as unknown=>Date;
    // could work without any tuple definition
    date4: ["=>"],
    user2: [
        { name: "string", age: "number" },
        "=>",
        (data) => ({ age, first: name.split(" ")[0] })
        // TODO: Implement named outputs or create issue
        // {
        //     out: (data) => ({ age, first: name.split(" ")[0] }),
        //     string: JSON.stringify,
        //     foo: (data) => {}
        // }
    ],
    user: {
        name: "string",
        birthday: "date"
    },
    person: {
        birthday: "otherDate"
    },
    myType: "user&person"
})

// Goals: preserve commutativity of operators (|, &)
// Allow operations that have an intuitive result, even if outside the normal bounds of type theory

// Is in/out a special case of contexts? No, because the key is that it defines
// a morph and doesn't necessarily define complete types for that morph

// Union of morphs:
// If inputs are discriminatable, allow, because we can return a determinsistic result
// input: (a=>b) | (c=>d)
// output:
//   if a is discriminatable from c:
//        (a|c)=>(b|d)
//      could also be represented as:
//        a: b
//        c: d
//   else:
//        Error: Cannot discriminate between a and c.

// Union with morph: treat the same as a union of two morphs
// input: a | (b=>c)
//   equivalent: (a=>a) | (b=>c)
// output:
//    if a discriminatable from c:
//       (a|b=> a|c)
//    else:
//        Error: Cannot discriminate between a and c.

// Intersection of morphs:

// input: (a=>b) & (c=>d)
// output: Error: Intersection between two non-equal morphs.

// |> could work like & by default but pipe morphs
// input: (a=>b) |> (c=>d)
// output:
//   if b is a subtype of c:
//     (a => d)
//   else:
//     error: b is not assignable to c

// Intersection with morphs:

// Just intersect with input
// input: a & (b=>c)
// output: (a&b)=>c

// a & (b=>c)
//
