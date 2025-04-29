import { bench } from "@ark/attest"
import { type } from "arktype"

const data = [...new Array(20000)].map(() => ({
	a: "1",
	b: "1",
	c: "", // Make sure we get validation error on this field
	d: "1",
	e: "1"
}))

const ArkType = type({
	a: "string > 0",
	b: "string > 0",
	c: "string > 0",
	d: "string > 0",
	e: "string > 0"
}).array()

const start = performance.now()
ArkType(data)
console.log(performance.now() - start)
