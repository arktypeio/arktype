import "./config.ts"
import { scope } from "arktype"

// a Scope's mutatesInput other than the configured one, which the build refuses
export const $ = scope({ U: { b: "string.trim" } }, { mutatesInput: "always" })
