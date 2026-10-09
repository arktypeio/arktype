import { makeItem } from "./items.ts"

// runs before items.ts imports arktype, which main.ts has loaded already
export const checkedItem = `${makeItem().expression}: ${makeItem()({ id: "1" })?.toString()}`
