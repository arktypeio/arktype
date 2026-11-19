import { attest, contextualize } from "@ark/attest"
import { unwrite, type WrittenModule } from "@ark/aot/internal/unwrite.ts"
import MagicString from "magic-string"

const reached = `import { type } from "arktype"
import { Name } from "./name.ts"

// @ark-strategy smallest
export const User = type({ name: Name })
export const check = (data: unknown) => User(data)
`

type Overwrite = [replaced: string, text: string]

// a module as arktype's transform writes it, with the mappings it returns
const writing = (source: string, ...overwrites: Overwrite[]): WrittenModule => {
	const s = new MagicString(source)
	for (const [replaced, text] of overwrites) {
		const start = source.indexOf(replaced)
		s.overwrite(start, start + replaced.length, text)
	}
	return {
		code: s.toString(),
		mappings: s.generateMap({ hires: "boundary" }).mappings
	}
}

// its definition as a call of what a virtual module creates, imported past
// the module's own imports
const written = writing(
	reached,
	['{ type } from "arktype"', '"arktype"'],
	[
		'"./name.ts"',
		'"./name.ts"\nimport { create as $ark_create } from "~arktype/a"'
	],
	["type({ name: Name })", "/* @__PURE__ */ $ark_create()"]
)

const unwritten = (built: string) =>
	unwrite({ id: "/user.ts", reached, written, built })

contextualize(() => {
	it("is the module as it reached arktype's where a transform changes no token", () => {
		attest(written.code).snap(`import "arktype"
import { Name } from "./name.ts"
import { create as $ark_create } from "~arktype/a"

// @ark-strategy smallest
export const User = /* @__PURE__ */ $ark_create()
export const check = (data: unknown) => User(data)
`)
		attest(
			unwritten(
				written.code.replace("/* @__PURE__ */ ", "").split("\n").join("\n\n")
			)
		).equals(reached)
	})

	it("erases what a transform erased, importing again what only the definition read", () => {
		// TypeScript's transform drops Name's import, as what arktype's wrote
		// no longer reads it, and ends each statement
		attest(
			unwritten(`import "arktype";
import { create as $ark_create } from "~arktype/a";
export const User = /* @__PURE__ */ $ark_create();
export const check = (data) => User(data);
`)
		).snap(`
import { Name as Name } from "./name.ts"
import { type } from "arktype";

;


// @ark-strategy smallest
export const User = type({ name: Name });

export const check = (data) => User(data);

`)
	})

	it("holds a read a transform adds", () => {
		attest(
			unwritten(`${written.code}export const named = () => User.expression\n`)
		).snap(`
import { type } from "arktype"
import { Name } from "./name.ts"

// @ark-strategy smallest
export const User = type({ name: Name })
export const check = (data: unknown) => User(data)
export const named = () => User.expression

`)
	})

	it("holds what a transform wraps a validator in around its definition", () => {
		attest(
			unwritten(
				written.code.replace(
					"/* @__PURE__ */ $ark_create()",
					"Object.freeze(/* @__PURE__ */ $ark_create())"
				)
			)
		).snap(`
import { type } from "arktype"
import { Name } from "./name.ts"

// @ark-strategy smallest
export const User = Object.freeze(/* @__PURE__ */  type({ name: Name }))

export const check = (data: unknown) => User(data)
`)
	})

	it("is undefined where a transform changes what arktype's wrote", () => {
		attest(
			unwritten(written.code.replace("$ark_create()", "$ark_create(Name)"))
		).equals(undefined)
	})

	it("is undefined where the module as built doesn't parse", () => {
		attest(unwritten("export const = 1")).equals(undefined)
	})

	it("adds past a declaration arktype's wrote as an export, whose braces aren't its definition's", () => {
		const source = `import { type } from "arktype"

export const User = type({ name: "string" })
`
		const exported = writing(source, [
			'export const User = type({ name: "string" })',
			'import { create as User } from "~arktype/a"\nexport { User }'
		])
		attest(
			unwrite({
				id: "/types.ts",
				reached: source,
				written: exported,
				built: `${exported.code}console.log(User.expression)\n`
			})
		).snap(`
import { type } from "arktype"

export const User = type({ name: "string" })

console.log(User.expression)
`)
	})

	describe("a module arktype's left as it was", () => {
		const island = `import { type } from "arktype"
import { User } from "./user.ts"

// @ark-runtime
const Local = type("string")
export const read = (data: unknown) => [User(data), Local(data)]
`
		const unwrittenIsland = (built: string) =>
			unwrite({ id: "/island.ts", reached: island, written: undefined, built })

		it("keeps the comment marking a definition, which a transform drops", () => {
			attest(
				unwrittenIsland(`import { type } from "arktype";
import { User } from "./user.ts";
const Local = type("string");
export const read = (data) => [User.assert(data), Local(data)];
`)
			).snap(`import { type } from "arktype";

import { User } from "./user.ts";


// @ark-runtime
const Local = type("string");

export const read = (data) => [User.assert(data), Local(data)];

`)
		})

		it("ends a statement a transform ended, so the one it adds next isn't read as its call", () => {
			attest(
				unwrite({
					id: "/main.js",
					reached:
						'// @ark-runtime\nconst first = type("string")\nexport const second = first\n',
					written: undefined,
					built:
						'const first = type("string");\n(() => first.assert)();\nexport const second = first;\n'
				})
			).snap(`// @ark-runtime
const first = type("string");

(() => first.assert)();

export const second = first;

`)
		})

		it("is the module as built where no comment marks a definition in it", () => {
			const built = "const first = User;\nexport const second = first;\n"
			attest(
				unwrite({
					id: "/main.js",
					reached: "const first = User\nexport const second = first\n",
					written: undefined,
					built
				})
			).equals(built)
		})
	})
})
