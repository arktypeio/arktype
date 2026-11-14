import { type } from "arktype"

export const User = type({ name: "string", age: "number.integer >= 0" })
