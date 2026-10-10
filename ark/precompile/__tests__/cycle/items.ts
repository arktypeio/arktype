import { checkedItem } from "./checkItem.ts"
import { type, type Traversal } from "arktype"

export function makeItem() {
	return type({ id: "number" })
}

// a factory, whose intern table the cycle reaches before this module's artifact is evaluated
export function makePositiveItem() {
	return type({ id: "number" }).narrow(isPositive)
}

// a bundle can rename it, so its message doesn't print its name
function isPositive(item: { id: number }, ctx: Traversal) {
	return item.id > 0 || ctx.mustBe("positive")
}

export const items = checkedItem
