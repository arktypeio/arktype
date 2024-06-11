import type { CastableBase } from "@arktype/util"
import { type } from "arktype"
import { scope } from "../type/scope.js"
import type { Type } from "../type/type.js"

const _Contact = type({
	email: "email",
	score: "integer < 100"
})

interface Contact extends CastableBase<typeof _Contact.t> {}

const Contact: Type<Contact> = _Contact
