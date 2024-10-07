import { type } from "arktype"

const AorB = type({
	"+": "reject",
	something: "'A'"
}).or({
	"+": "reject",
	something: "'B'",
	somethingelse: "number"
})

console.log(AorB.internal.assertHasKind("union").discriminantJson)

const out2 = AorB({ something: "A" }) //?
