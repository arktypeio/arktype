declare const input: string

import { regex } from "arkregex"

const contact = regex(
	"(?<email>\\w+@\\w+\\.\\w+)|(?<phone>\\d{3}-\\d{3}-\\d{4})"
)

const matches = contact.exec(input)

if (matches) {
	const groups = matches.groups

	console.log(groups)
}
