import type { StandardSchemaV1 } from "@standard-schema/spec"
import { Account, Signup, types } from "./schemas.ts"

export type SignupInput = StandardSchemaV1.InferInput<typeof Signup>

export type SignupOutput = StandardSchemaV1.InferOutput<typeof Signup>

const parse = <schema extends StandardSchemaV1>(
	schema: schema,
	data: StandardSchemaV1.InferInput<schema>
): StandardSchemaV1.InferOutput<schema> => {
	const result = schema["~standard"].validate(data)
	if (result instanceof Promise || result.issues) throw new Error("invalid")
	return result.value
}

export const signUp = (data: StandardSchemaV1.InferInput<typeof Signup>) =>
	parse(Signup, data)

export function readAccount(data: unknown) {
	return parse(Account, data as never)
}

export const reply = (comment: typeof types.comment.infer) =>
	parse(types.comment, comment)

export const accountsById = (accounts: (typeof Account.infer)[]) =>
	Object.fromEntries(accounts.map(account => [account.id, account] as const))

export const lastSignup = { at: 0, data: parse(Signup, {} as never) }
