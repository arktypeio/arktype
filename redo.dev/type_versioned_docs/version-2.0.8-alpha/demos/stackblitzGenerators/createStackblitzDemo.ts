import sdk from "@stackblitz/sdk"

export type EmbedId = "type" | "space" | "constraints" | "declaration"
export type AddonFile = "user" | "group"
export type DemoProps = {
    embedId: EmbedId
    addonFiles?: AddonFile[]
}
type DemoArgs = {
    files: Record<string, string>
    title: string
    description: string
    embedId: EmbedId
}
export const DEMO_ELEMENT_ID = "re-type-demo"
export const createStackblitzDemo = ({
    files,
    title,
    description,
    embedId
}: DemoArgs) => {
    sdk.embedProject(
        DEMO_ELEMENT_ID,
        {
            files,
            title,
            description,
            template: "typescript",
            dependencies: {
                // @lineFrom:@re-/type/package.json:version => "@re-/type": {?},
                "@re-/type": "2.0.8-alpha",
                // @lineFrom:@re-/tools/package.json:version => "@re-/tools": {?}
                "@re-/tools": "2.2.3"
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
