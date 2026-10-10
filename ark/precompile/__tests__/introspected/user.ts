import { type } from "arktype"

export const User = type({ name: "string", "tags?": "string[]" })
