import { Holder } from "./holder.ts"

// the default's check reads the node Holder keeps from its own Scope, so it holds only that node's narrow
export const Defaulted = Holder.and({ p: ["number", "=", 5] })
