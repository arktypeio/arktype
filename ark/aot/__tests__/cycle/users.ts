import { type } from "arktype"
import { checkedUser } from "./checkUser.ts"

export function makeUser() {
	return type({ name: "string" })
}

export const users = checkedUser
