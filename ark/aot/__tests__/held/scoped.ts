import { scope } from "arktype"
import { isTruthy } from "./predicates.ts"

export const truthy = scope({ truthy: ["unknown", ":", isTruthy], s: "string" })

// its nodes hold no function, so its factory copies a validator written once
export const Named = truthy.type({ name: "s" })
