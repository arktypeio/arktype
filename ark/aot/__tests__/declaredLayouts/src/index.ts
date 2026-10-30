import { type } from "arktype"
import { Account } from "./nested/accounts.ts"

export const Owned = type({ account: type.instanceOf(Account) })
