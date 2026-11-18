import { checkedItem } from "./checkItem.ts"
import { type, type Traversal } from "arktype"

// its prop's meta is a module of its own, which the cycle reaches before it runs
export function makeItem() {
	return type({ id: type("number").describe("an id") })
}

// a factory whose intern table the cycle reaches before its artifact runs
export function makePositiveItem() {
	return type({ id: "number" }).narrow(isPositive)
}

// a bundle can rename it, so its message doesn't print its name
function isPositive(item: { id: number }, ctx: Traversal) {
	return item.id > 0 || ctx.mustBe("positive")
}

export const items = checkedItem
