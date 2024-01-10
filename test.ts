/* eslint-disable @typescript-eslint/no-restricted-imports */
import { type } from "arktype"

const User = type({
	id: "string"
})

type User = typeof User.infer
