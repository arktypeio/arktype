import { scope, type } from "arktype"
import { register } from "./registry.ts"

export const and = () => Base.and({ b: "number" })

export const json = function () {
	return E.json
}

const scoped = () => $.type("x[]")

export { scoped as aliased }

// the registry calls each back before this module's body declares what it reads
export const registered = register()

const Base = type({ a: "string" })

const E = type({ e: "number" })

const $ = scope({ x: "string" })
