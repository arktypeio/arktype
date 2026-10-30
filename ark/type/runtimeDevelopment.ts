// arktype/runtime under the "development" condition: Node prints issues, and a
// Type's member a validator never has throws where read
import { ArkErrors, Validator, type UnavailableMember } from "./runtime.ts"

Object.defineProperty(
	ArkErrors.prototype,
	Symbol.for("nodejs.util.inspect.custom"),
	{
		value(this: ArkErrors) {
			return this.issues
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
