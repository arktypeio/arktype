import { type } from "arktype"

export const makeUser = () => type({ name: "string", email: "string.email" })

export const Strings = type.keywords.string
