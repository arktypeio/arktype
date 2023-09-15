import { type } from "arktype"

const t = type({
	a: "string | number | boolean | semver | creditCard | email | string[]  |boolean[] | (number | bigint)[]"
})
