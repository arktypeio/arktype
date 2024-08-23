import { type } from "arktype"

const isoDateString = type("string").narrow((s, ctx) => {
	if (!/.*/.test(s)) return ctx.mustBe("a valid ISO date string")
	return true
})

const isoDate = isoDateString.pipe(s => new Date(s))

const test = type({
	date: "string.date.iso.parse"
})

const o = {
	date: "1991-01-01T00:00:00.000Z"
}

test(o)

console.log(typeof o.date) // logs "object"
