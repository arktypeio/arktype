// arktype/runtime under the "development" condition: Node prints errors by
// name, and a Type's member a validator never has throws where read
import { ArkErrors, Validator, type UnavailableMember } from "./runtime.ts"

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

export * from "./runtime.ts"
