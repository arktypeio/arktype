import { Holder } from "./holder.ts"

// the default's check reads the node Holder keeps from its own Scope
export const Defaulted = Holder.and({ p: ["number", "=", 5] })
