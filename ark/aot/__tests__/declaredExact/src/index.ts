import { type } from "arktype"

export const Optional = type({ "a?": "string", "b?": "string | undefined" })

export const Elements = type(["string", "number?"])
