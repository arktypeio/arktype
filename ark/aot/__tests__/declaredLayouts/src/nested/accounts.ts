import { type } from "arktype"

export class Account {
	declare id: string
}

export const Accounts = type.instanceOf(Account).array()
