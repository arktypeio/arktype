import { type } from "arktype"

const decode = (s: string) => atob(s)

export const Token = type({
	payload: type("string.base64").pipe.try(decode).to("string > 0"),
	"claims?": type("string").pipe.try((s): unknown => JSON.parse(s)),
	version: "x/^v(\\d+)$/"
})
