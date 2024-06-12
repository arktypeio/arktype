import { type, type Type } from "arktype"

const _contact = type({
	email: "email",
	score: "integer < 100"
})

type _Contact = typeof _contact.t

interface Contact extends _Contact {}

export const contact: Type<Contact> = _contact
// ---cut---
const goodContact = contact.narrow((data, ctx) => {
	if (data.score > 75 || data.email.endsWith("@arktype.io")) {
		return true
	}
	// add a customizable error and return false
	return ctx.mustBe("a better contact")
})

const out = goodContact({
	email: "david@gmail.com",
	score: 60
})

if (out instanceof type.errors) {
	console.error(out.summary)
} else {
	console.log(`${out.email}: ${out.score}`)
}
