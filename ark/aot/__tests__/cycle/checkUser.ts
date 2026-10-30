import { makeUser } from "./users.ts"

// runs before users.ts's body, which imports this module after arktype
export const checkedUser = (
	makeUser()({ name: 1 }) as { issues: readonly { code: string }[] }
).issues.map(issue => issue.code)
