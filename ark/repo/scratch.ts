import { declare, scope, type } from "arktype"

const point2d = type({
	x: "number",
	y: "number",
	"+": "delete"
})

const point3d = type({
	x: "number",
	y: "number",
	z: "number",
	"+": "delete"
})

const t = point2d.or(point3d)

// number
const n = type("1 | number").expression

type Expected = {
	a: string
	b?: number
	c: string
}

const u = declare<Expected>().type({
	// string of at least length 15
	a: "string >= 15",
	// positive integer less than 100
	"b?": "0 < number.integer < 100",
	// custom predicate
	c: type.string.narrow((s, ctx) =>
		s === [...s].reverse().join("") ? true : ctx.mustBe("a palindrome")
	)
})
