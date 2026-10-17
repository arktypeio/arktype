import "./config.ts"
import { scope, type } from "arktype"

export const T = type({ a: "string" })

export const $ = scope({ U: { b: "number" } }, { errors: "none" })
