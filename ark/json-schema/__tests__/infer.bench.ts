import { bench } from "@ark/attest"
import { jsonSchema, jsonSchemaToType } from "@ark/json-schema"
import type { inferJsonSchema } from "@ark/json-schema/internal/infer.ts"

bench.baseline(() => {
	jsonSchemaToType({
		type: "object",
		properties: { _: { type: "array", items: { type: "null" } } },
		required: ["_"]
	})
	jsonSchemaToType({
		type: "array",
		prefixItems: [{ type: "null" }],
		minItems: 1,
		items: false
	})
	jsonSchemaToType({ anyOf: [{ type: "null" }, { const: false }] })
	jsonSchemaToType({ allOf: [{ type: "null" }, { enum: [false] }] })
	jsonSchemaToType({ $defs: { _: { type: "null" } }, $ref: "#/$defs/_" })
})

bench("type string", () => jsonSchemaToType({ type: "string" })).types([
	46,
	"instantiations"
])

// equivalent to type({ a: "string[]", b: "number[]", c: { nested: "boolean[]" } })
bench("object literal", () =>
	jsonSchemaToType({
		type: "object",
		properties: {
			a: { type: "array", items: { type: "string" } },
			b: { type: "array", items: { type: "number" } },
			c: {
				type: "object",
				properties: { nested: { type: "array", items: { type: "boolean" } } },
				required: ["nested"]
			}
		},
		required: ["a", "b", "c"]
	})
).types([500, "instantiations"])

bench("if/then/else", () =>
	jsonSchemaToType({
		type: "object",
		properties: { kind: { enum: ["a", "b"] } },
		required: ["kind"],
		if: { properties: { kind: { const: "a" } } },
		then: { properties: { a: { type: "string" } }, required: ["a"] },
		else: { properties: { b: { type: "number" } }, required: ["b"] }
	})
).types([853, "instantiations"])

bench("$ref cyclic", () =>
	jsonSchemaToType({
		type: "object",
		properties: {
			value: { type: "number" },
			children: { type: "array", items: { $ref: "#" } }
		},
		required: ["value"]
	})
).types([440, "instantiations"])

bench("jsonSchema", () =>
	jsonSchema({
		type: "object",
		properties: { a: { type: "string" }, b: { type: "number" } },
		required: ["a"]
	})
).types([258, "instantiations"])

// inferring a generic schema from a contextual type walks every branch
bench("generic wrapper", () => {
	const wrap = <const s>(s: s): inferJsonSchema<s> => s as never
	const _: { a: string } = wrap({
		type: "object",
		properties: { a: { type: "string" } },
		required: ["a"]
	})
}).types([112896, "instantiations"])

// a wide flat object: 200 properties of three kinds, every other one required
// prettier-ignore
const properties200 = { type: "object", properties: { k0: { type: "string" }, k1: { type: "number" }, k2: { type: "array", items: { type: "boolean" } }, k3: { type: "string" }, k4: { type: "number" }, k5: { type: "array", items: { type: "boolean" } }, k6: { type: "string" }, k7: { type: "number" }, k8: { type: "array", items: { type: "boolean" } }, k9: { type: "string" }, k10: { type: "number" }, k11: { type: "array", items: { type: "boolean" } }, k12: { type: "string" }, k13: { type: "number" }, k14: { type: "array", items: { type: "boolean" } }, k15: { type: "string" }, k16: { type: "number" }, k17: { type: "array", items: { type: "boolean" } }, k18: { type: "string" }, k19: { type: "number" }, k20: { type: "array", items: { type: "boolean" } }, k21: { type: "string" }, k22: { type: "number" }, k23: { type: "array", items: { type: "boolean" } }, k24: { type: "string" }, k25: { type: "number" }, k26: { type: "array", items: { type: "boolean" } }, k27: { type: "string" }, k28: { type: "number" }, k29: { type: "array", items: { type: "boolean" } }, k30: { type: "string" }, k31: { type: "number" }, k32: { type: "array", items: { type: "boolean" } }, k33: { type: "string" }, k34: { type: "number" }, k35: { type: "array", items: { type: "boolean" } }, k36: { type: "string" }, k37: { type: "number" }, k38: { type: "array", items: { type: "boolean" } }, k39: { type: "string" }, k40: { type: "number" }, k41: { type: "array", items: { type: "boolean" } }, k42: { type: "string" }, k43: { type: "number" }, k44: { type: "array", items: { type: "boolean" } }, k45: { type: "string" }, k46: { type: "number" }, k47: { type: "array", items: { type: "boolean" } }, k48: { type: "string" }, k49: { type: "number" }, k50: { type: "array", items: { type: "boolean" } }, k51: { type: "string" }, k52: { type: "number" }, k53: { type: "array", items: { type: "boolean" } }, k54: { type: "string" }, k55: { type: "number" }, k56: { type: "array", items: { type: "boolean" } }, k57: { type: "string" }, k58: { type: "number" }, k59: { type: "array", items: { type: "boolean" } }, k60: { type: "string" }, k61: { type: "number" }, k62: { type: "array", items: { type: "boolean" } }, k63: { type: "string" }, k64: { type: "number" }, k65: { type: "array", items: { type: "boolean" } }, k66: { type: "string" }, k67: { type: "number" }, k68: { type: "array", items: { type: "boolean" } }, k69: { type: "string" }, k70: { type: "number" }, k71: { type: "array", items: { type: "boolean" } }, k72: { type: "string" }, k73: { type: "number" }, k74: { type: "array", items: { type: "boolean" } }, k75: { type: "string" }, k76: { type: "number" }, k77: { type: "array", items: { type: "boolean" } }, k78: { type: "string" }, k79: { type: "number" }, k80: { type: "array", items: { type: "boolean" } }, k81: { type: "string" }, k82: { type: "number" }, k83: { type: "array", items: { type: "boolean" } }, k84: { type: "string" }, k85: { type: "number" }, k86: { type: "array", items: { type: "boolean" } }, k87: { type: "string" }, k88: { type: "number" }, k89: { type: "array", items: { type: "boolean" } }, k90: { type: "string" }, k91: { type: "number" }, k92: { type: "array", items: { type: "boolean" } }, k93: { type: "string" }, k94: { type: "number" }, k95: { type: "array", items: { type: "boolean" } }, k96: { type: "string" }, k97: { type: "number" }, k98: { type: "array", items: { type: "boolean" } }, k99: { type: "string" }, k100: { type: "number" }, k101: { type: "array", items: { type: "boolean" } }, k102: { type: "string" }, k103: { type: "number" }, k104: { type: "array", items: { type: "boolean" } }, k105: { type: "string" }, k106: { type: "number" }, k107: { type: "array", items: { type: "boolean" } }, k108: { type: "string" }, k109: { type: "number" }, k110: { type: "array", items: { type: "boolean" } }, k111: { type: "string" }, k112: { type: "number" }, k113: { type: "array", items: { type: "boolean" } }, k114: { type: "string" }, k115: { type: "number" }, k116: { type: "array", items: { type: "boolean" } }, k117: { type: "string" }, k118: { type: "number" }, k119: { type: "array", items: { type: "boolean" } }, k120: { type: "string" }, k121: { type: "number" }, k122: { type: "array", items: { type: "boolean" } }, k123: { type: "string" }, k124: { type: "number" }, k125: { type: "array", items: { type: "boolean" } }, k126: { type: "string" }, k127: { type: "number" }, k128: { type: "array", items: { type: "boolean" } }, k129: { type: "string" }, k130: { type: "number" }, k131: { type: "array", items: { type: "boolean" } }, k132: { type: "string" }, k133: { type: "number" }, k134: { type: "array", items: { type: "boolean" } }, k135: { type: "string" }, k136: { type: "number" }, k137: { type: "array", items: { type: "boolean" } }, k138: { type: "string" }, k139: { type: "number" }, k140: { type: "array", items: { type: "boolean" } }, k141: { type: "string" }, k142: { type: "number" }, k143: { type: "array", items: { type: "boolean" } }, k144: { type: "string" }, k145: { type: "number" }, k146: { type: "array", items: { type: "boolean" } }, k147: { type: "string" }, k148: { type: "number" }, k149: { type: "array", items: { type: "boolean" } }, k150: { type: "string" }, k151: { type: "number" }, k152: { type: "array", items: { type: "boolean" } }, k153: { type: "string" }, k154: { type: "number" }, k155: { type: "array", items: { type: "boolean" } }, k156: { type: "string" }, k157: { type: "number" }, k158: { type: "array", items: { type: "boolean" } }, k159: { type: "string" }, k160: { type: "number" }, k161: { type: "array", items: { type: "boolean" } }, k162: { type: "string" }, k163: { type: "number" }, k164: { type: "array", items: { type: "boolean" } }, k165: { type: "string" }, k166: { type: "number" }, k167: { type: "array", items: { type: "boolean" } }, k168: { type: "string" }, k169: { type: "number" }, k170: { type: "array", items: { type: "boolean" } }, k171: { type: "string" }, k172: { type: "number" }, k173: { type: "array", items: { type: "boolean" } }, k174: { type: "string" }, k175: { type: "number" }, k176: { type: "array", items: { type: "boolean" } }, k177: { type: "string" }, k178: { type: "number" }, k179: { type: "array", items: { type: "boolean" } }, k180: { type: "string" }, k181: { type: "number" }, k182: { type: "array", items: { type: "boolean" } }, k183: { type: "string" }, k184: { type: "number" }, k185: { type: "array", items: { type: "boolean" } }, k186: { type: "string" }, k187: { type: "number" }, k188: { type: "array", items: { type: "boolean" } }, k189: { type: "string" }, k190: { type: "number" }, k191: { type: "array", items: { type: "boolean" } }, k192: { type: "string" }, k193: { type: "number" }, k194: { type: "array", items: { type: "boolean" } }, k195: { type: "string" }, k196: { type: "number" }, k197: { type: "array", items: { type: "boolean" } }, k198: { type: "string" }, k199: { type: "number" } }, required: ["k0", "k2", "k4", "k6", "k8", "k10", "k12", "k14", "k16", "k18", "k20", "k22", "k24", "k26", "k28", "k30", "k32", "k34", "k36", "k38", "k40", "k42", "k44", "k46", "k48", "k50", "k52", "k54", "k56", "k58", "k60", "k62", "k64", "k66", "k68", "k70", "k72", "k74", "k76", "k78", "k80", "k82", "k84", "k86", "k88", "k90", "k92", "k94", "k96", "k98", "k100", "k102", "k104", "k106", "k108", "k110", "k112", "k114", "k116", "k118", "k120", "k122", "k124", "k126", "k128", "k130", "k132", "k134", "k136", "k138", "k140", "k142", "k144", "k146", "k148", "k150", "k152", "k154", "k156", "k158", "k160", "k162", "k164", "k166", "k168", "k170", "k172", "k174", "k176", "k178", "k180", "k182", "k184", "k186", "k188", "k190", "k192", "k194", "k196", "k198"], additionalProperties: false } as const

bench("properties(200)", () => jsonSchemaToType(properties200)).types([
	6753,
	"instantiations"
])
