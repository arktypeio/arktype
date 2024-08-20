import { scope, type } from "arktype"

const string = scope({
	$root: "string",
	somethingElse: "$root[]"
}).export()

const $ = scope({
	bar: string,
	foobra: "Exclude<boolean, true>"
})

const t = $.type("bar.somethingElse")

const user = type({
	username: "string"
})

const endpoint = type({
	username: "string"
})
"".toLowerCase()
