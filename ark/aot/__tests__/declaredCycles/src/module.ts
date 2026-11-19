import { scope } from "arktype"

export const types = scope({
	user: { name: "string", "friends?": "user[]" },
	group: { members: "user[]", "parent?": "group" }
}).export()

export const parseUser = (data: unknown) => types.user.assert(data)

export function firstFriend(data: typeof types.user.infer, fallback?: string) {
	return data.friends?.[0] ?? fallback
}
