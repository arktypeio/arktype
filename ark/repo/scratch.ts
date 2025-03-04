import { type } from "arktype"

const types = type.module(
	{
		foo: {
			test: "string = 'test'"
		}
	},
	{ jitless: true }
)

types.foo({}) //?
