import sdk from "@stackblitz/sdk"
import { buildStackblitzIndexText } from "./buildStackblitzIndexText"
import { defaultStaticFiles } from "./defaultFiles"
import {
    addonFilesByEmdedId,
    contentsByEmbedId,
    getAddonFiles
} from "./rawDemoFiles"

export const embedIds = { type: 1, scope: 1 }
export type EmbedId = keyof typeof embedIds
export type AddonFile = never
export type DemoProps = {
    embedId: EmbedId
    addonFiles?: AddonFile[]
}

export const DEMO_ELEMENT_ID = "arktype-demo"

export const createStackblitzDemo = async ({ embedId }: DemoProps) =>
    sdk.embedProject(
        DEMO_ELEMENT_ID,
        {
            files: {
                [`${embedId}.ts`]: contentsByEmbedId[embedId],
                "index.ts": buildStackblitzIndexText(embedId),
                ...defaultStaticFiles,
                ...getAddonFiles(addonFilesByEmdedId[embedId] ?? [])
            },
            title: embedId,
            description: `Demo for ${embedId}`,
            template: "typescript",
            dependencies: {
                // @lineFrom:package.json:version => "arktype": {?},
                arktype: "0.1.4"
            },
            settings: {
                compile: {
                    clearConsole: false
                }
            }
        },
        {
            height: "100%",
            openFile: `${embedId}.ts`
        }
    )
