import { type } from "arktype"

// human-readable descriptions by default
const l = type("0 < number <= 100").divisibleBy(2)
console.log(l.description)

const r = type("number % 3").lessThan(10)
console.log(r.description)

// intersections automatically reduced to their optimal representation
const both = l.and(r)
console.log(both.description)

// attempting to create an invalid Type yields a ParseError
// const whoops = both.moreThan(20)
