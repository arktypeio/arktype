import { match } from "arktype"

const sizeOf = match({
	number: (n) => n,
	"string|unknown[]": (data) => data.length
})

const result = sizeOf(2) //?
const result2 = sizeOf("foobar") //?
