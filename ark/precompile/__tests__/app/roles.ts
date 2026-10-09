import { scope } from "arktype"
import { User } from "./schemas.ts"

export const roles = scope({
	user: User,
	admin: ["user", "&", { role: "'admin'" }]
})
