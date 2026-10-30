import "./config.ts"
import { scope } from "arktype"

// a Scope's errors other than the configured ones, which the build refuses
export const $ = scope({ U: { b: "number" } }, { errors: "none" })
