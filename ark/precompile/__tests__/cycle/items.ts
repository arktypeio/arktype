import { checkedItem } from "./checkItem.ts"
import { type } from "arktype"

export function makeItem() {
	return type({ id: "number" })
}

export const items = checkedItem
