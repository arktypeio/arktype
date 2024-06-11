import { type } from "arktype"
import type { Type } from "../type/type.js"

const _Contact = type({
	email: "email",
	score: "integer < 100"
})

interface Contact extends type.of<typeof _Contact.t> {}

type Z = Contact["inferIn"]

const contact: Contact = _Contact
