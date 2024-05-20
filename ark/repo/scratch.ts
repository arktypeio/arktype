import { match, type } from "arktype"

const sizeOf = match({
	"string|Array": _ => _.length,
	number: _ => _,
	bigint: _ => _
}).orThrow()

const a = sizeOf("abc") //=>?
const b = sizeOf([1, 2, 3]) //=>?
const c = sizeOf(5n) //=>?
