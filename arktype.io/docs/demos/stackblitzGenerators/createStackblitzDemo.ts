import sdk from "@stackblitz/sdk"
import { getAddonFiles } from "../StackBlitzDemo"
import { buildStackblitzIndexText } from "./buildStackblitzIndexText"
import { defaultStaticFiles } from "./defaultFiles"
import { addonFilesByEmdedId, contentsByEmbedId } from "./rawDemoFiles"

export const embedIds = { type: 1, space: 1, constraints: 1, declaration: 1 }
export type EmbedId = keyof typeof embedIds
export type AddonFile = "user" | "group" | "names"
export type DemoProps = {
    embedId: EmbedId
    addonFiles?: AddonFile[]
}

export const DEMO_ELEMENT_ID = "arktype-demo"

export const createStackblitzDemo = ({ embedId }: DemoProps) => {
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
                // @lineFrom:@arktype/io/package.json:version => "@arktype/io": {?},
                "@arktype/io": "0.0.1",
                // @lineFrom:@arktype/io/package.json:version => "@arktype/tools": {?}
                "@arktype/tools": "0.0.1"
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
}
