import { type } from "arktype"

const nospacePattern = /^\S*$/

const schema = type({
	name: "string",
	email: "email",
	tags: "(string>=2)[]>=3",
	score: "integer>=0",
	"date?": "Date",
	"nospace?": nospacePattern,
	extra: "string|null"
})

const data = {
	name: "Ok",
	email: "",
	tags: ["AB", "B"],
	score: -1,
	date: undefined,
	nospace: "One space"
}

const out = schema(data)

console.log("nospace matches:", nospacePattern.test(data.nospace))

if (out instanceof type.errors) {
	console.log(out.summary)
} else {
	console.log(out)
}
