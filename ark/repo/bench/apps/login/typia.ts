import typia, { type tags } from "typia"

export interface Login {
	email: string & tags.Format<"email">
	password: string & tags.MinLength<8> & tags.MaxLength<64>
}

export const Login = typia.createValidate<Login>()
