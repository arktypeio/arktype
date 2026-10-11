import { Named } from "./scoped.ts"

// `truthy` resolves in Named's Scope, so the factory takes its narrow from the validator it receives
export const Flagged = Named.and({ flag: "truthy" })
