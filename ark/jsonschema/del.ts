// console.log(t.assert({ a: 3, b: 2 }))
// const t = parseJsonSchema({
// 	type: "object",
// 	properties: { a: { type: "string" } },
// 	required: ["a"],
// 	additionalProperties: { type: "number" }
// })
// console.log(t.assert({ a: 3, b: 2 }))

// const t = parseJsonSchema({
// 	type: "object",
// 	properties: { adegf: { type: "string" } },
// 	patternProperties: { "^[a-z]+$": { type: "string", minLength: 5 } }
// })
// console.log(t.assert({ adegf: "adfgh" }))

// const t = parseJsonSchema({
// 	type: "object",
// 	properties: { adegf: { type: "string" } },
// 	propertyNames: { type: "string", minLength: 5 }
// })
// console.log(t.assert({ adegf: "foo", bcdge: 2 }))

// const t = parseJsonSchema({
// 	type: "object",
// 	properties: {
// 		a: { type: "string" },
// 		b: { type: "number" },
// 		c: { oneOf: [{ type: "string" }, { type: "number" }] }
// 	},
// 	required: ["a", "b"],
// 	maxProperties: 2
// })
// console.log(t.assert({ a: "string", b: "stringButShouldBeNumber" }))

// const jsonSchemaValidator = parseJsonSchema({
// 	allOf: [{ type: "string" }, { const: "hello" }]
// } as const)
// const jsonSchemaValidator = parseJsonSchema({ type: "string", pattern: "hello" })
//     ^?

// const jsonSchemaValidator = parseJsonSchema({ not: { type: "string" } })

// const jsonSchemaValidator = parseJsonSchema({
// 	oneOf: [
// 		{ type: "string", maxLength: 5, minLength: 3, pattern: "foobar" },
// 		{
// 			type: "object",
// 			properties: {
// 				foo: { type: "string" },
// 				bar: {
// 					type: "array",
// 					items: {
// 						type: "object",
// 						properties: { baz: { type: "string", pattern: "baz" } }
// 					}
// 				}
// 			},
// 			required: ["foo"]
// 		}
// 	]
// })
// const jsonSchemaValidator = parseJsonSchema({
// 	allOf: [
// 		{ type: "string", maxLength: 5 },
// 		{ type: "string", pattern: "foo" }
// 	]
// })
// const f = jsonSchemaValidator.assert("fooba")
// console.log(f)

// const jsonSchemaValidator = parseJsonSchema({
// 	type: "number",
// 	maximum: 10,
// 	exclusiveMinimum: 4,
// 	multipleOf: 2
// })
// //    ^?

// if (jsonSchemaValidator instanceof ArkErrors)
// 	throw new Error(jsonSchemaValidator.summary)

// const out = jsonSchemaValidator.assert(6)
// console.log(out)

//
//
//
//
//

// import type { TraversalContext } from "@arktype/schema"
// import { type, type Type } from "arktype"

// type ExtraObjectKeywords = {
// 	minProperties?: number
// 	maxProperties?: number
// 	patternProperties?: [RegExp, Type][]
// 	propertyNamesSchema?: Type
// 	additionalPropertiesSchema?: Type
// }

// const handleExtraObjectKeywords = (
// 	data: object,
// 	ctx: TraversalContext,
// 	opts?: ExtraObjectKeywords
// ) => {
// 	const {
// 		minProperties = 0,
// 		maxProperties = Infinity,
// 		patternProperties = [],
// 		propertyNamesSchema,
// 		additionalPropertiesSchema
// 	} = opts ?? {}

// 	const allKeys = Object.keys(data)
// 	const totalKeys = allKeys.length

// 	// Validate min and max properties
// 	if (totalKeys < minProperties) {
// 		return ctx.reject({
// 			message: `must be an object with at least ${minProperties} properties (had ${totalKeys})`
// 		})
// 	} else if (totalKeys > maxProperties) {
// 		return ctx.reject({
// 			message: `must be an object must have at most ${maxProperties} properties (had ${totalKeys})`
// 		})
// 	}

// 	// Validate property names
// 	if (propertyNamesSchema !== undefined) {
// 		for (const key of allKeys) {
// 			if (!propertyNamesSchema.allows(key)) {
// 				return ctx.reject({
// 					message: `Key '${key}' must be ${propertyNamesSchema.description} due to 'propertyNames' (was ${key})`
// 				})
// 			}
// 		}
// 	}

// 	// Validate pattern properties and additional properties
// 	Object.entries(data).forEach(([key, value]) => {
// 		console.log(key)
// 		let didMatchAnyPatternProperty: boolean = false
// 		patternProperties.forEach(([pattern, schema]) => {
// 			if (pattern.test(key)) {
// 				didMatchAnyPatternProperty = true
// 				if (!schema.allows(value)) {
// 					ctx.reject({
// 						path: [key],
// 						expected: `${schema.description} due to matching pattern property '${pattern}'`,
// 						actual: (value as any).toString()
// 					})
// 				}
// 			}
// 		})
// 		if (didMatchAnyPatternProperty) return

// 		if (
// 			additionalPropertiesSchema !== undefined &&
// 			!["foo", "bar"].includes(key) &&
// 			!additionalPropertiesSchema.allows(value)
// 		) {
// 			ctx.reject({
// 				path: [key],
// 				expected: `${additionalPropertiesSchema.description} due to being an extra property`,
// 				actual: value.toString()
// 			})
// 		}
// 	})

// 	return true
// }

// // const t = type({ foo: "number", "bar?": "string" }).narrow((data, ctx) =>
// // 	handleExtraObjectKeywords(data, ctx, {
// // 		additionalPropertiesSchema: type("number")
// // 	})
// // )

// // console.log(
// // 	t.assert({
// // 		foo: 3,
// // 		bar: 3,
// // 		baz: 3,
// // 		bad: "3"
// // 	})
// // )

// const t = type({ "[string<2]": "number" }).onUndeclaredKey("reject")
// console.log(t.assert({ foo: 3, bar: 3, baz: 3, bad: 4 }))
// 					message: `Key '${key}' must be ${propertyNamesSchema.description} due to 'propertyNames' (was ${key})`
// 				})
// 			}
// 		}
// 	}

// 	// Validate pattern properties and additional properties
// 	Object.entries(data).forEach(([key, value]) => {
// 		console.log(key)
// 		let didMatchAnyPatternProperty: boolean = false
// 		patternProperties.forEach(([pattern, schema]) => {
// 			if (pattern.test(key)) {
// 				didMatchAnyPatternProperty = true
// 				if (!schema.allows(value)) {
// 					ctx.reject({
// 						path: [key],
// 						expected: `${schema.description} due to matching pattern property '${pattern}'`,
// 						actual: (value as any).toString()
// 					})
// 				}
// 			}
// 		})
// 		if (didMatchAnyPatternProperty) return

// 		if (
// 			additionalPropertiesSchema !== undefined &&
// 			!["foo", "bar"].includes(key) &&
// 			!additionalPropertiesSchema.allows(value)
// 		) {
// 			ctx.reject({
// 				path: [key],
// 				expected: `${additionalPropertiesSchema.description} due to being an extra property`,
// 				actual: value.toString()
// 			})
// 		}
// 	})

// 	return true
// }

// // const t = type({ foo: "number", "bar?": "string" }).narrow((data, ctx) =>
// // 	handleExtraObjectKeywords(data, ctx, {
// // 		additionalPropertiesSchema: type("number")
// // 	})
// // )

// // console.log(
// // 	t.assert({
// // 		foo: 3,
// // 		bar: 3,
// // 		baz: 3,
// // 		bad: "3"
// // 	})
// // )

// const t = type({ "[string<2]": "number" }).onUndeclaredKey("reject")
// console.log(t.assert({ foo: 3, bar: 3, baz: 3, bad: 4 }))
// 					message: `Key '${key}' must be ${propertyNamesSchema.description} due to 'propertyNames' (was ${key})`
// 				})
// 			}
// 		}
// 	}

// 	// Validate pattern properties and additional properties
// 	Object.entries(data).forEach(([key, value]) => {
// 		console.log(key)
// 		let didMatchAnyPatternProperty: boolean = false
// 		patternProperties.forEach(([pattern, schema]) => {
// 			if (pattern.test(key)) {
// 				didMatchAnyPatternProperty = true
// 				if (!schema.allows(value)) {
// 					ctx.reject({
// 						path: [key],
// 						expected: `${schema.description} due to matching pattern property '${pattern}'`,
// 						actual: (value as any).toString()
// 					})
// 				}
// 			}
// 		})
// 		if (didMatchAnyPatternProperty) return

// 		if (
// 			additionalPropertiesSchema !== undefined &&
// 			!["foo", "bar"].includes(key) &&
// 			!additionalPropertiesSchema.allows(value)
// 		) {
// 			ctx.reject({
// 				path: [key],
// 				expected: `${additionalPropertiesSchema.description} due to being an extra property`,
// 				actual: value.toString()
// 			})
// 		}
// 	})

// 	return true
// }

// // const t = type({ foo: "number", "bar?": "string" }).narrow((data, ctx) =>
// // 	handleExtraObjectKeywords(data, ctx, {
// // 		additionalPropertiesSchema: type("number")
// // 	})
// // )

// // console.log(
// // 	t.assert({
// // 		foo: 3,
// // 		bar: 3,
// // 		baz: 3,
// // 		bad: "3"
// // 	})
// // )

// const t = type({ "[string<2]": "number" }).onUndeclaredKey("reject")
// console.log(t.assert({ foo: 3, bar: 3, baz: 3, bad: 4 }))
// 					message: `Key '${key}' must be ${propertyNamesSchema.description} due to 'propertyNames' (was ${key})`
// 				})
// 			}
// 		}
// 	}

// 	// Validate pattern properties and additional properties
// 	Object.entries(data).forEach(([key, value]) => {
// 		console.log(key)
// 		let didMatchAnyPatternProperty: boolean = false
// 		patternProperties.forEach(([pattern, schema]) => {
// 			if (pattern.test(key)) {
// 				didMatchAnyPatternProperty = true
// 				if (!schema.allows(value)) {
// 					ctx.reject({
// 						path: [key],
// 						expected: `${schema.description} due to matching pattern property '${pattern}'`,
// 						actual: (value as any).toString()
// 					})
// 				}
// 			}
// 		})
// 		if (didMatchAnyPatternProperty) return

// 		if (
// 			additionalPropertiesSchema !== undefined &&
// 			!["foo", "bar"].includes(key) &&
// 			!additionalPropertiesSchema.allows(value)
// 		) {
// 			ctx.reject({
// 				path: [key],
// 				expected: `${additionalPropertiesSchema.description} due to being an extra property`,
// 				actual: value.toString()
// 			})
// 		}
// 	})

// 	return true
// }

// // const t = type({ foo: "number", "bar?": "string" }).narrow((data, ctx) =>
// // 	handleExtraObjectKeywords(data, ctx, {
// // 		additionalPropertiesSchema: type("number")
// // 	})
// // )

// // console.log(
// // 	t.assert({
// // 		foo: 3,
// // 		bar: 3,
// // 		baz: 3,
// // 		bad: "3"
// // 	})
// // )

// const t = type({ "[string<2]": "number" }).onUndeclaredKey("reject")
// console.log(t.assert({ foo: 3, bar: 3, baz: 3, bad: 4 }))

//
//
//
//
//

// type f = inferJsonSchemaArray<{
// 	type: "array"
// 	items: [{ type: "string" }, { type: "number" }]
// 	additionalItems: { type: "boolean" }
// }>
// //   ^?

// type g = inferJsonSchemaArray<{
// 	type: "array"
// 	items: { type: "string" }
// 	additionalItems: { type: "number" }
// }>
// //   ^?

// type h = inferJsonSchemaArray<{
// 	type: "array"
// 	items: []
// 	additionalItems: { type: "number" }
// }>
// //   ^?

//
//
//

// type("1<string.integer.parse<3").assert("3")

// import { type } from "arktype"

// const t0 = type("number>5")

// const t1 = type({ "[string]": t0 })
// console.log(JSON.stringify(t1.json))
//
//
//

// import {
// 	type,
// 	type AtMostLength,
// 	type Type,
// 	type applyConstraint
// } from "arktype"

// const t = type("unknown[]>5")
// type t = (typeof t)["infer"]

// type f = Type<applyConstraint<unknown[], "maxLength", { rule: 5 }>>
// type g = f["infer"]
// //   ^?

//
//
//

// import { rootNode } from "@ark/schema";
// import type { Type, applyConstraint } from "arktype";

// type f = Type<applyConstraint<applyConstraint<string, "maxLength", { rule: 5 }>, "minLength", { rule: 3 }>>
// //   ^?

//
//
//

// import { type } from "arktype"

// const obj = { foo: 3 }

// const t = type({
// 	foo: "number"
// }).pipe(o => ({ a: o }))

// const a = t(obj)
// console.log(a) // { foo: 6 }
// console.log(obj) // { foo: 3 }

// import { type } from "arktype"

// const t = type({
// 	"optionalKey?": ["string", "=>", x => x.toLowerCase()],
// 	requiredKey: ["string", "=>", x => x.toLowerCase()]
// })

// const a = t.assert({ optionalKey: "Hi", requiredKey: "Hi" })
// console.log(a)

//
//

// import { scope } from "arktype"

// const $ = scope({
// 	TypeWithNoKeywords: { type: "'boolean'|'null'" },
// 	TypeWithKeywords: "ArraySchema|ObjectSchema", // without both of these there's no error
// 	// "#BaseSchema": "TypeWithNoKeywords|boolean", // errors even with union reversed
// 	"#BaseSchema": "boolean|TypeWithNoKeywords", // without the `boolean` there's no error (even if still union such as `string|TypeWithNoKeywords`)
// 	ArraySchema: {
// 		"additionalItems?": "BaseSchema", // without this recursion there's no error
// 		type: "'array'"
// 	},
// 	// If `ObjectSchema` isn't an object, there's no error
// 	// E.g. `ObjectSchema: "string[]"` is fine
// 	ObjectSchema: {
// 		type: "'object'"
// 	}
// })
// export const JsonSchema = $.export() // TypeError: Cannot use 'in' operator to search for 'type' in false

//
//

// import { type } from "arktype"

// const t = type(["parse.integer", "=>", n => n >= 5])
// console.log(t.assert("5"))
