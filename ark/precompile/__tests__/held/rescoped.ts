import { Named } from "./scoped.ts"

// `truthy` resolves in Named's Scope, so its narrow comes from the validator
export const Flagged = Named.and({ flag: "truthy" })
