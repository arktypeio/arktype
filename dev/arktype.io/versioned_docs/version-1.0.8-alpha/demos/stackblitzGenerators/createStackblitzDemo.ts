import sdk from "@stackblitz/sdk"
import demoContents from "../generated/demo"
import scopeContents from "../generated/scope"
import typeContents from "../generated/type"
import { buildStackblitzIndexText } from "./buildStackblitzIndexText"
import { defaultStaticFiles } from "./defaultFiles"

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
    sdk.embedProject(
        DEMO_ELEMENT_ID,
        {
            files: {
                [`${embedId}.ts`]: contentsByEmbedId[embedId],
                "index.ts": buildStackblitzIndexText(embedId),
                ...defaultStaticFiles
            },
            title: embedId,
            description: `ArkType ${embedId} demo`,
            template: "typescript",
            dependencies: {
                // @lineFrom:package.json:version |> embed("arktype":,,)
                arktype: "1.0.8-alpha"
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
