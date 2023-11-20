import sdk from "@stackblitz/sdk"
import demoContents from "../generated/demo.js"
import scopeContents from "../generated/scope.js"
import typeContents from "../generated/type.js"
import { buildStackblitzIndexText } from "./buildStackblitzIndexText.js"
import { defaultStaticFiles } from "./defaultFiles.js"

export const embedIds = { type: 1, scope: 1, demo: 1 }
export type EmbedId = keyof typeof embedIds

export type DemoProps = {
	embedId: EmbedId
}

export const contentsByEmbedId: Record<EmbedId, string> = {
	type: typeContents,
	scope: scopeContents,
	demo: demoContents
}

export const DEMO_ELEMENT_ID = "arktype-demo"

export const createStackblitzDemo = async ({ embedId }: DemoProps) =>
	sdk.default.embedProject(
		DEMO_ELEMENT_ID,
		{
			files: {
				[`${embedId}.ts`]: contentsByEmbedId[embedId],
				"index.ts": buildStackblitzIndexText(embedId),
				".prettierrc": JSON.stringify({
					tabWidth: 4,
					semi: false,
					trailingComma: "none"
				}),
				...defaultStaticFiles
			},
			title: embedId,
			description: `ArkType ${embedId} demo`,
			template: "typescript",
			dependencies: {
				// @lineFrom:package.json:version |> embed("arktype":,,)
				arktype: "1.0.15-alpha"
			},
			settings: {
				compile: {
					clearConsole: false,
					trigger: "keystroke"
				}
			}
		},
		{
			height: "100%",
			openFile: `${embedId}.ts`
		}
	)
