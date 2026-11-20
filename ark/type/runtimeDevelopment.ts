// arktype/runtime under the "development" condition: Node prints errors by
// name, and a read of a Type's member a validator never has, or that its build
// didn't bake, warns with the fix
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
		}
	}
)

// what a Type has but a validator never does, which a library may read, e.g.
// `schema.in.toJsonSchema()`
const typeMembers: ReadonlySet<string> = new Set([
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
] satisfies UnavailableMember[])

// what a build bakes as the validator's own where it sees code read it
const introspectionMembers: ReadonlySet<string> = new Set([
	"expression",
	"description",
	"json",
	"toJSON",
	"toJsonSchema"
] satisfies IntrospectionMember[])

// a member a build didn't bake, which reads undefined in production
const lacks = (member: IntrospectionMember) =>
	`${member} isn't precompiled: set members["${member}"] true in the precompile options`

const warned = new Set<string>()
// set while a validator prints, which reads its expression where it has one
let printing = false

// once for each member, with the stack of the code reading it. Counted once
// logged, so where console.warn throws, as a test's may, each read throws
const warnOnce = (member: string, message: string) => {
	if (printing || warned.has(member)) return
	console.warn(new Error(message))
	warned.add(member)
}

// A read of a member a validator lacks warns rather than throws, and reads
// undefined as in production, so code testing whether a validator has a
// member, like JSON.stringify reading toJSON or a Standard Schema library
// asking whether `"jsonSchema" in schema["~standard"]`, behaves as it does
// there. A getter on Validator.prototype would answer `in` and throw where
// it's read, so the read is caught past it, by what Validator.prototype
// inherits: a proxy of an object, whose own prototype is Object.prototype as
// Validator.prototype's is in production, so what has no such member, like
// `instanceof Object` or a read of hasOwnProperty, finds what it would there
Object.setPrototypeOf(
	Validator.prototype,
	new Proxy(
		{},
		{
			get: (target, k, receiver) => {
				if (typeof k === "string") {
					if (typeMembers.has(k)) {
						warnOnce(
							k,
							`${k} is a Type's, which this standalone validator lacks. Put // @ark-runtime before the definition it's read off, so arktype defines it, or build with runtime: "arktype".`
						)
					} else if (introspectionMembers.has(k))
						warnOnce(k, lacks(k as IntrospectionMember))
				}
				return Reflect.get(target, k, receiver)
			},
			// a validator is assigned its `~standard` as it's created, which this
			// receives as the validator has none of its own: one with no
			// jsonSchema baked warns where its jsonSchema is read
			set: (target, k, value, receiver) =>
				(
					k === "~standard" &&
					typeof value === "object" &&
					value !== null &&
					!("jsonSchema" in value)
				) ?
					Reflect.defineProperty(receiver, k, {
						value: new Proxy(value as StandardSchemaV1.Props, {
							get: (standard, k, receiver) => {
								// a module importing the validator may bake it later
								if (k === "jsonSchema" && !(k in standard))
									warnOnce(
										"~standard.jsonSchema",
										lacks("~standard.jsonSchema")
									)
								return Reflect.get(standard, k, receiver)
							}
						}),
						writable: true,
						enumerable: true,
						configurable: true
					})
				:	Reflect.set(target, k, value, receiver)
		}
	)
)

// what prints a validator reads its expression, and one without prints as it
// does in production, without warning
const { toString } = Validator.prototype

Validator.prototype.toString = function (this: Validator): string {
	printing = true
	try {
		return toString.call(this)
	} finally {
		printing = false
	}
}

export * from "./runtime.ts"
