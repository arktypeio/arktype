import { makeItem, makePositiveItem } from "./items.ts"

// runs before items.ts imports arktype, which main.ts has loaded already
export const checkedItem = [
	makeItem()({ id: "1" })?.toString(),
	makePositiveItem()({ id: -1 })?.toString()
]
