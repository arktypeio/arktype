import { regex, type } from "arktype"

const RegexSignature = type({
	"[/^_/]": "(string | number)[]"
})

RegexSignature

regex("string | number")
