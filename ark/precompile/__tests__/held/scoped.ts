import { scope } from "arktype"
import { isTruthy } from "./predicates.ts"

export const truthy = scope({ truthy: ["unknown", ":", isTruthy], s: "string" })

// its own nodes hold no function, so its factory copies a validator written once, keyed by the Scope's functions
export const Named = truthy.type({ name: "s" })
