import { makeUser } from "./users.ts"

// runs before users.ts's body, which imports this module after arktype, printing what a standalone validator's errors keep of arktype's
export const checkedUser = (
	makeUser()({ name: 1 }) as { issues: readonly { code: string }[] }
).issues.map(issue => issue.code)
