import { User } from "./schemas.ts"

export const Admin = User.and({ role: "'admin'" })
