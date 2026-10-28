// arktype/runtime under the "development" condition, where Node prints errors
// as their issues and a member the build didn't bake throws where it's read,
// so a production build ships nothing for either
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

// where the build couldn't see the read, which reads undefined in production
for (const member of [
	"expression",
	"description",
	"json",
	"toJSON",
	"toJsonSchema"
]) {
	Object.defineProperty(Validator.prototype, member, {
		get: () => {
			throw new Error(
				`${member} isn't baked into this validator. Set members.${member} true, or build with runtime: "arktype".`
			)
		},
		// a member the build bakes is the validator's own
		set(this: Validator, value: unknown) {
			Object.defineProperty(this, member, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			})
		}
	})
}

// a Type's members a validator never has, which a library handed the
// validator may read, e.g. `schema.in.toJsonSchema()`, where production
// reads undefined and throws something that doesn't name the fix
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

Object.defineProperty(Validator.prototype, "toString", {
	value(this: Validator) {
		const expression = Object.getOwnPropertyDescriptor(
			this,
			"expression"
		)?.value
		return expression ? `Type<${expression}>` : "Type"
	},
	writable: true,
	configurable: true
})

export * from "./runtime.ts"
