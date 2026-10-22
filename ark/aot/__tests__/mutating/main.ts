import "./config.ts"
import { scope, type } from "arktype"

export const T = type({ a: "string.trim" })

export const $ = scope({ U: { b: "string.trim" } }, { mutatesInput: "always" })
