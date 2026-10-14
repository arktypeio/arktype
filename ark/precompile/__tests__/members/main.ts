import { type } from "arktype"

export const User = type({ name: "string" })

export const assertUser = (data: unknown) => User.assert(data)
