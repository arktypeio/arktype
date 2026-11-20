// arktype/runtime under the "development" condition: Node prints errors by
// name, and a Type's member a validator never has, or that its build didn't
// bake, throws where read
import type { StandardSchemaV1 } from "@ark/schema"
import {
	ArkErrors,
	Validator,
	type IntrospectionMember,
	type UnavailableMember
} from "./runtime.ts"

// as @ark/schema's kinds.ts prints the errors arktype returns
Object.defineProperty(
	ArkErrors.prototype,
	Symbol.for("nodejs.util.inspect.custom"),
	{
		value(
			this: ArkErrors,
			depth: number | null,
			options: object,
			inspect?: (value: unknown, options: object) => string
		) {
			const shown = { summary: this.summary, issues: this.issues }
			if (typeof inspect !== "function") return shown
			if (depth !== null && depth < 0) return "[ArkErrors]"
			// one level more, so an issue prints as deep as it did in a bare array
			return `ArkErrors ${inspect(shown, { ...options, depth: depth === null ? null : depth + 1 })}`
		},
		configurable: true
	}
)

// a Type's members a validator never has, which a library may read, e.g. `schema.in.toJsonSchema()`
for (const member of [
	"in",
	"out",
	"encode",
	"and",
	"or",
	"intersect",
	"merge",
	"pipe",
	"to",
	"narrow",
	"filter",
	"array",
	"as",
	"brand",
	"configure",
	"describe",
	"onUndeclaredKey",
	"onDeepUndeclaredKey",
	"keyof",
	"get",
	"map",
	"omit",
	"pick",
	"partial",
	"required",
	"readonly",
	"extract",
	"exclude",
	"atLeastLength",
	"atMostLength",
	"moreThanLength",
	"lessThanLength",
	"exactlyLength",
	"matching",
	"atLeast",
	"atMost",
	"moreThan",
	"lessThan",
	"divisibleBy",
	"atOrAfter",
	"atOrBefore",
	"laterThan",
	"earlierThan",
	"optional",
	"default",
	"ifEquals",
	"ifExtends",
	"equals",
	"extends",
	"overlaps",
	"distribute",
	"select",
	"props",
	"internal",
	"$"
] satisfies UnavailableMember[]) {
	Object.defineProperty(Validator.prototype, member, {
		get: () => {
			throw new Error(
				`${member} is a Type's, which this standalone validator lacks. Put // @ark-runtime before the definition it's read off, so arktype defines it, or build with runtime: "arktype".`
			)
		},
		configurable: true
	})
}

// a member a build didn't bake, which reads undefined in production
const lacks = (member: IntrospectionMember): Error =>
	new Error(
		`${member} isn't precompiled: set members["${member}"] true in the precompile options`
	)

// one a build bakes is the validator's own, defined over these
for (const member of [
	"expression",
	"description",
	"json",
	"toJSON",
	"toJsonSchema"
] satisfies IntrospectionMember[]) {
	Object.defineProperty(Validator.prototype, member, {
		get: () => {
			throw lacks(member)
		},
		configurable: true
	})
}

// what prints a validator reads its expression, and one without prints as it
// does in production
const { toString } = Validator.prototype

Validator.prototype.toString = function (this: Validator): string {
	try {
		return toString.call(this)
	} catch {
		return "Type"
	}
}

// a validator is assigned its `~standard` as it's created, which this
// receives: one with no jsonSchema baked is held as a copy whose jsonSchema
// throws, frozen if what was assigned is
Object.defineProperty(Validator.prototype, "~standard", {
	set(this: Validator, standard: StandardSchemaV1.Props) {
		let held = standard
		if (!("jsonSchema" in standard)) {
			held = Object.defineProperty({ ...standard }, "jsonSchema", {
				get: () => {
					throw lacks("~standard.jsonSchema")
				},
				enumerable: true,
				configurable: true
			})
			if (Object.isFrozen(standard)) Object.freeze(held)
		}
		Object.defineProperty(this, "~standard", {
			value: held,
			writable: true,
			enumerable: true,
			configurable: true
		})
	},
	configurable: true
})

export * from "./runtime.ts"
