import { bench } from "@re-/assert"
import { define, type } from "../../../index.js"

const tupleDef = define(["string?", "number?", ["boolean?"]])

bench("parse", () => {
    type(tupleDef)
})
    .median()
    .type()

const tupleType = type(tupleDef)

bench("check(valid)", () => {
    tupleType.check(["okay", 5, [true]])
}).median()

bench("check(invalid)", () => {
    tupleType.check(["okay", 5, [true]])
}).median()
