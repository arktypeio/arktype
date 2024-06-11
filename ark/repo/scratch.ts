import { type, type Type } from "arktype"

const _contact = type({
	email: "email",
	score: "integer < 100"
})

type _Contact = typeof _contact.t

interface Contact extends _Contact {}

export const contact: Type<Contact> = _contact

const contacts = contact.array().atLeastLength(1)

const extractDuplicates = (arr: typeof contacts.infer) =>
	Object.values(Object.groupBy(arr, contact => contact.email)).flatMap(
		contactsWithEmail =>
			contactsWithEmail && contactsWithEmail.length > 1 ?
				contactsWithEmail[0].email
			:	[]
	)
// ---cut---

const uniqueContacts = contacts.narrow((arr, ctx) => {
	// get a list of the duplicate emails
	const duplicates = extractDuplicates(arr)

	// return true if there are no duplicates
	if (duplicates.length === 0) return true

	// or false with a custom error message listing the duplicates
	return ctx.invalid({
		expected: "an array of unique contacts",
		actual: `duplicated by ${duplicates}`
	})
})
