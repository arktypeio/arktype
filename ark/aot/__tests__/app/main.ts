import { scope, type } from "arktype"
import { Handle, Payload, Profile, User, Users } from "./schemas.ts"

const Node = type({ value: "number", "next?": "this" })

// a bundle can rename a predicate, so its message doesn't print its name
const Chain = type({
	value: type("number").narrow((n, ctx) => n > 0 || ctx.mustBe("positive")),
	"next?": "this"
})

const shapes = scope({
	tree: { value: "number", "children?": "tree[]" },
	"box<t>": { box: "t" }
}).export()

const BoxedTree = shapes.box("tree")

// destructured, as `forms.member` would read it
const forms = { member: User, lists: [Users] }
const {
	member,
	lists: [list]
} = forms

const ada = { name: "Ada", email: "ada@example.com", age: 36, tags: ["math"] }

const loop = { value: 1, children: [] as unknown[] }
loop.children.push(loop)

const samples: [(data: unknown) => unknown, unknown][] = [
	[User, ada],
	[
		User,
		{ ...ada, name: "", email: "ada", age: 36.5, tags: [1, "b", "c", "d"] }
	],
	[User, { ...ada, role: "owner", plan: "team" }],
	[Users, [ada, { ...ada, age: -1 }]],
	[Payload, { kind: "create", user: ada, extra: true }],
	[Payload, { kind: "delete", id: "c4a760a8-dbcf-4e14-9f39-645a8e933d74" }],
	[Payload, { kind: "delete", id: "1234" }],
	[Payload, { kind: "update" }],
	[Handle, " @ada "],
	[Profile, { handle: "@ada", joined: "2020-06-01" }],
	[Profile, { handle: "ada", joined: "2020-06-01" }],
	[Node, { value: 1, next: { value: 2, next: { value: "3" } } }],
	[Chain, { value: 1, next: { value: -1 } }],
	[shapes.tree, { value: 1, children: [{ value: 2 }, { value: "3" }] }],
	[data => shapes.tree(data) === data, loop],
	[BoxedTree, { box: { value: 1, children: [{}] } }],
	[member.or("null"), null],
	[list.or("null"), null]
]

// errors print what a standalone validator keeps of arktype's
console.log(
	JSON.stringify(
		samples.map(([validate, data]) => {
			const out = validate(data)
			return out instanceof type.errors ?
					out.issues.map(issue => [issue.code, ...issue.path])
				:	out
		})
	)
)
