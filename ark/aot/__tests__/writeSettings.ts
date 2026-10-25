// writes the validators @ark/aot checks its settings with, and ark.json's
// JSON Schema: pnpm writePrecompileSettings
import { fromHere } from "@ark/fs"
import { precompileStandalone } from "arktype/internal/standalone.ts"
import { build } from "esbuild"
import { writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { format, resolveConfig } from "prettier"
import { ArkJson, PackageArk, PrecompileOptions } from "./settingsSchema.ts"

export const validatorsPath = fromHere("..", "settingsValidators.ts")

export const jsonSchemaPath = fromHere("..", "ark.schema.json")

interface OptionSchema {
	type?: string
	enum?: unknown[]
	const?: unknown
	anyOf?: OptionSchema[]
}

// what the CLI's usage says an option takes, whose strings are all paths
const valuesOf = (schema: OptionSchema): string =>
	schema.anyOf ? schema.anyOf.map(valuesOf).join("|")
	: schema.enum ? schema.enum.join("|")
	: "const" in schema ? String(schema.const)
	: schema.type === "boolean" ? "true|false"
	: schema.type === "array" ? "a,b"
	: schema.type === "object" ? "json"
	: "path"

// a flag for each option, parsed as its schema's type
const cliOptionsOf = () =>
	Object.fromEntries(
		Object.entries(
			(
				PrecompileOptions.toJsonSchema() as {
					properties: Record<string, OptionSchema>
				}
			).properties
		).map(([name, schema]) => [
			name,
			{
				type:
					(
						schema.type === "boolean" ||
						schema.type === "array" ||
						schema.type === "object"
					) ?
						schema.type
					:	"string",
				values: valuesOf(schema)
			}
		])
	)

const formatted = async (code: string, path: string) =>
	format(code, { ...(await resolveConfig(path)), filepath: path })

// precompiled, since a Type created where the build runs would fix arktype's
// configuration before the program's configure() could set it, and bundled,
// since the runtime a program loads must be the one the build resolves
export const writeSettingsFiles = async (): Promise<Record<string, string>> => {
	const { code } = precompileStandalone(
		{ PrecompileOptions, ArkJson, PackageArk } as never,
		{
			// reads no configuration, so it leaves the program's to configure()
			configured: false,
			optimize: "size",
			members: {
				assert: false,
				meta: false,
				"~standard": false,
				methods: false
			}
		}
	)
	// with a copy of the runtime, so the build loads none a program could share
	const { outputFiles } = await build({
		stdin: {
			contents: code,
			resolveDir: dirname(validatorsPath),
			loader: "js"
		},
		// which the comment naming each module's path is relative to
		absWorkingDir: fromHere("..", "..", ".."),
		bundle: true,
		format: "esm",
		platform: "neutral",
		conditions: ["ark-ts"],
		write: false,
		logLevel: "error"
	})
	return {
		[validatorsPath]: await formatted(
			`/* eslint-disable */\n// @ts-nocheck\n// written by __tests__/writeSettings.ts from __tests__/settingsSchema.ts\n${outputFiles[0].text}\nexport const cliOptions = ${JSON.stringify(cliOptionsOf())}\n`,
			validatorsPath
		),
		[jsonSchemaPath]: await formatted(
			JSON.stringify(ArkJson.toJsonSchema()),
			jsonSchemaPath
		)
	}
}

if (process.argv[1] === import.meta.filename) {
	const files = await writeSettingsFiles()
	for (const path in files) writeFileSync(path, files[path])
}
