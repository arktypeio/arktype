import { match } from "arktype"

const sizeOf = match({
	number: (n) => n,
	string: (s) => s.length
})

const result = sizeOf(2) //?
const result2 = sizeOf("foobar") //?
