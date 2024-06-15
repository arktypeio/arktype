class TypeNode {
	constructor(public innerHash: string) {}

	foo = 5

	intersect() {
		return true
	}
}

const contextualTypeNode = (base: TypeNode, path: string) =>
	Object.create(base, {
		path: { value: path }
	})

const string = new TypeNode("string")

const stringRoot = contextualTypeNode(string, "")
const stringName = contextualTypeNode(string, "name")
