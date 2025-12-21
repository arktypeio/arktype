import { scope, type } from "arktype"

const $ = scope({
	Foo: {
		"oneOf?": "Bar[]" // NB: don't get the error if this is not an array
	},
	Bar: "Foo"
}).export()

const baz = $.Bar.pipe((_: object): type.Any | undefined => {
	console.log("this never gets logged since pipe isn't entered")
	return type("string")
})

const r = baz({ oneOf: [{}] }) // throws "TypeError: this.Foo1Apply is not a function"
console.log(r?.toString())
