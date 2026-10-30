// valibot.dev's login form in typia: createValidate reports every error, each with typia's own text (path and
// expected type); typia has no way to attach the form's messages, and one bound per tag kind, so the
// password's non-empty check is its length check
import typia, { type tags } from "typia"

interface Login {
	email: string & tags.MinLength<1> & tags.Format<"email">
	password: string & tags.MinLength<8>
}

const check = typia.createValidate<Login>()

export const validate = (data: unknown) => {
	const result = check(data)
	if (result.success) return result.data
	throw new Error(
		result.errors.map(e => `${e.path}: expected ${e.expected}`).join("\n")
	)
}
