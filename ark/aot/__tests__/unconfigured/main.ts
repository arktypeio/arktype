import "./config.ts"
import { type } from "arktype"

export const User = type({ name: "string" })

export const json = JSON.stringify(User)
