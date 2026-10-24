import { type } from "arktype"

export const User = type({ name: "string", "tags?": "string[]" })

export const Trimmed = type({ name: "string.trim" })
