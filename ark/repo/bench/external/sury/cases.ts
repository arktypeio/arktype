// Sury's schema benchmark (packages/benchmarks/topics/schema.ts at 1f035c5),
// its performance rows verbatim plus z.compile's: "parse" is "Parse with a
// schema you already have", "build" is "Build the schema and parse once".
// bundle.ts bundles it against the suite's own installs (SURY_BENCH's
// node_modules, sury from its working tree); arktype.ts is the same ArkType
// arm, precompiled
import { Type } from "@sinclair/typebox"
import { TypeCompiler } from "@sinclair/typebox/compiler"
import { Value } from "@sinclair/typebox/value"
import { type } from "arktype"
import * as S from "sury"
import * as v from "valibot"
import { z } from "zod"

export const VALUE = Object.freeze({
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
	boolean: true,
	deeplyNested: { foo: "bar", num: 1, bool: false }
})

const SURY = S.schema({
	number: S.number,
	negNumber: S.number,
	maxNumber: S.number,
	string: S.string,
	longString: S.string,
	boolean: S.boolean,
	deeplyNested: { foo: S.string, num: S.number, bool: S.boolean }
})
const ZOD = z.object({
	number: z.number(),
	negNumber: z.number(),
	maxNumber: z.number(),
	string: z.string(),
	longString: z.string(),
	boolean: z.boolean(),
	deeplyNested: z.object({
		foo: z.string(),
		num: z.number(),
		bool: z.boolean()
	})
})
const TYPEBOX = Type.Object({
	number: Type.Number(),
	negNumber: Type.Number(),
	maxNumber: Type.Number(),
	string: Type.String(),
	longString: Type.String(),
	boolean: Type.Boolean(),
	deeplyNested: Type.Object({
		foo: Type.String(),
		num: Type.Number(),
		bool: Type.Boolean()
	})
})
const VALIBOT = v.object({
	number: v.number(),
	negNumber: v.number(),
	maxNumber: v.number(),
	string: v.string(),
	longString: v.string(),
	boolean: v.boolean(),
	deeplyNested: v.object({
		foo: v.string(),
		num: v.number(),
		bool: v.boolean()
	})
})
const ARKTYPE = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: { foo: "string", num: "number", bool: "boolean" }
})

const suryParse = S.parseOrThrow(SURY)
const typeboxCheck = TypeCompiler.Compile(TYPEBOX)
// z.compile, Zod's compiled mode, which the suite predates: added as ArkType's
// arm is, so Zod is measured in its fastest mode too
const zodCompiled = z.compile(ZOD)

export const cases: Record<string, () => unknown> = {
	"parse Sury": () => suryParse(VALUE),
	"parse Zod": () => ZOD.parse(VALUE),
	"parse Zod (compiled)": () => zodCompiled.parse(VALUE),
	"parse TypeBox": () => typeboxCheck.Check(VALUE),
	"parse Valibot": () => v.parse(VALIBOT, VALUE),
	"parse ArkType (dynamic)": () => ARKTYPE.assert(VALUE),
	"build Sury": () =>
		S.parseOrThrow(
			S.schema({
				number: S.number,
				negNumber: S.number,
				maxNumber: S.number,
				string: S.string,
				longString: S.string,
				boolean: S.boolean,
				deeplyNested: { foo: S.string, num: S.number, bool: S.boolean }
			})
		)(VALUE),
	"build Zod": () =>
		z
			.object({
				number: z.number(),
				negNumber: z.number(),
				maxNumber: z.number(),
				string: z.string(),
				longString: z.string(),
				boolean: z.boolean(),
				deeplyNested: z.object({
					foo: z.string(),
					num: z.number(),
					bool: z.boolean()
				})
			})
			.parse(VALUE),
	"build Zod (compiled)": () =>
		z
			.compile(
				z.object({
					number: z.number(),
					negNumber: z.number(),
					maxNumber: z.number(),
					string: z.string(),
					longString: z.string(),
					boolean: z.boolean(),
					deeplyNested: z.object({
						foo: z.string(),
						num: z.number(),
						bool: z.boolean()
					})
				})
			)
			.parse(VALUE),
	"build TypeBox": () => Value.Check(TYPEBOX, VALUE),
	"build Valibot": () =>
		v.parse(
			v.object({
				number: v.number(),
				negNumber: v.number(),
				maxNumber: v.number(),
				string: v.string(),
				longString: v.string(),
				boolean: v.boolean(),
				deeplyNested: v.object({
					foo: v.string(),
					num: v.number(),
					bool: v.boolean()
				})
			}),
			VALUE
		),
	"build ArkType (dynamic)": () =>
		type({
			number: "number",
			negNumber: "number",
			maxNumber: "number",
			string: "string",
			longString: "string",
			boolean: "boolean",
			deeplyNested: { foo: "string", num: "number", bool: "boolean" }
		}).assert(VALUE)
}
