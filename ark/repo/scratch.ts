import { type } from "../type/index.js"
// class TypeNode {
// 	constructor(public innerHash: string) {}

// 	foo = 5

// 	intersect() {
// 		return this.path
// 	}
// }

// const contextualTypeNode = (base: TypeNode, path: string) =>
// 	Object.create(base, {
// 		path: { value: path }
// 	})

// const string = new TypeNode("string")

// const stringRoot = contextualTypeNode(string, "")
// const stringName = contextualTypeNode(string, "name")

// stringRoot instanceof TypeNode //?
// stringRoot.intersect() //?
// stringName.intersect() //?

const palindromicContact = type({
	email: "email",
	score: "integer < 100"
})

const out = palindromicContact({
	email: "david@arktype.io",
	score: 133.7
})

if (out instanceof type.errors) {
	console.error(out.summary)
} else {
	console.log(out.email)
}
