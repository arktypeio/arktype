// items.ts first, so callFirst.ts runs within its imports
import { items } from "./items.ts"
import { calledFirst } from "./callFirst.ts"

console.log(items, calledFirst)
