import { type } from "arktype"

const Foo = type.unit("foo").describe("foo")
const Bar = type.unit("bar").describe("bar")

const Thing = type({
	"versions?": Foo.or(Bar)
})

const fooSchema = Thing.toJsonSchema()

console.log(fooSchema)
