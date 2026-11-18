import { scope, type } from "arktype"
import { Account, Signup, types } from "./schemas.ts"

// each holds a Type's data the way a library's type might

export interface Loaded<data, error = never> {
	data: data
	error: error | undefined
}

export class Store<state> {
	declare state: state
}

type Validator<i = unknown, o = unknown> = { inferIn: i; infer: o }

const load = <o>(schema: Validator<unknown, o>): Loaded<o> => ({
	data: schema.infer,
	error: undefined
})

const handlerOf =
	<i, o>(schema: Validator<i, o>) =>
	(input: i, ...fallbacks: o[]): Promise<o> =>
		Promise.resolve(fallbacks[0] ?? schema.infer)

const tupleOf = <a, b>(a: Validator<unknown, a>, b: Validator<b>) =>
	[a.infer, b.inferIn, a.infer] as [a, b?, ...a[]]

const either = <a, b>(a: a, b: b) => a as a | b

const keyedBy = <value>(value: Validator<unknown, value>) =>
	({ 0: value.infer }) as { [id: number]: value; [name: string]: value | null }

export const Role = type("'admin' | 'member'")

export const Created = type("Date")

// the same shape as Account, from another definition
export const Contact = type({ id: "string", email: "string" })

export const Numbered = type({ id: "number", email: "string" })

export const loaded = load(Account)

export const stored = new Store<typeof Signup.infer>()

export const handler = handlerOf(Signup)

export const tupled = tupleOf(Account, Signup)

export const frozen = Object.freeze([Account.assert({})])

export const merged = Object.assign(Account.assert({}), { token: "" })

export const byId: Record<string, typeof Account.infer | undefined> = {}

export const validated = Account["~standard"].validate({})

// a member of the union is told from the other by a key's type
export const told = either(Account.infer, Numbered.infer)

// two members with the same keys and types can't be
export const untold = either(Account.infer, Contact.infer)

// each `Loaded` is told from the other by its argument's keys
export const loadedEither = either(load(Account), load(Signup))

export const keyed = keyedBy(Signup)

// a literal union or a global is the same type wherever it's written
export const interned = { role: load(Role), created: load(Created) }

export const inline = load(type({ inline: "string" }))

export const thread = load(types.thread)

export const { data, error } = load(Signup)

export function loadComment() {
	return load(types.comment)
}

export const lists = scope({
	node: { value: "string.numeric.parse", "next?": "node" }
}).export()

export const parsed = handlerOf(lists.node)

export function tagged<tag>(tag: tag) {
	return { tag, account: Account.assert(tag), schema: Account }
}

export const taggedBy = <tag>(tag: tag) => ({ tag, signup: Signup.assert(tag) })
