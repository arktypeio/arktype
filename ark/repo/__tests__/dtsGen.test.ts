import { attest, contextualize } from "@ark/attest"
import { Project, ts } from "ts-morph"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { regexDts } from "../../docs/components/dts/regex.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { schemaDts } from "../../docs/components/dts/schema.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { setsDts } from "../../docs/components/dts/sets.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { typeDts } from "../../docs/components/dts/type.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { utilDts } from "../../docs/components/dts/util.ts"

contextualize(() => {
	it("playground infers through the bundled declarations", () => {
		const project = new Project({
			useInMemoryFileSystem: true,
			compilerOptions: {
				strict: true,
				exactOptionalPropertyTypes: true,
				target: ts.ScriptTarget.ESNext,
				moduleResolution: ts.ModuleResolutionKind.Node10
			}
		})
		project.createSourceFile("util.d.ts", utilDts)
		project.createSourceFile("schema.d.ts", schemaDts)
		project.createSourceFile("sets.d.ts", setsDts)
		project.createSourceFile("type.d.ts", typeDts)
		project.createSourceFile("regex.d.ts", regexDts)

		const main = project.createSourceFile(
			"main.ts",
			`
import { regex } from "arkregex"
import { scope } from "arktype"

const ok = regex("^ok$", "i")

const required = scope({
	user: { "name?": "string" },
	requiredUser: "Required<user>"
}).export().requiredUser.infer
`
		)

		const inferred = Object.fromEntries(
			main
				.getVariableDeclarations()
				.map(declaration => [
					declaration.getName(),
					declaration.getType().getText()
				])
		)

		attest(inferred).snap({
			ok: 'Regex<"ok" | "oK" | "Ok" | "OK", { flags: "i"; }>',
			required: "{ name: string; }"
		})
	})
})
