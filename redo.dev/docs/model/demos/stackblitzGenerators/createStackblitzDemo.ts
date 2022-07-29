import sdk from "@stackblitz/sdk"

export type EmbedId = "model" | "space" | "constraints" | "declaration"
export type DeclarationFiles = "user" | "group"
export type DemoProps = {
    embedId: EmbedId
    addonFiles?: DeclarationFiles[]
}
type DemoArgs = {
    files: Record<string, string>
    title: string
    description: string
    embedId: EmbedId
}
const ELEMENT_ID = "demo"
export const createStackblitzDemo = ({
    files,
    title,
    description,
    embedId
}: DemoArgs) => {
    sdk.embedProject(
        ELEMENT_ID,
        {
            files,
            title,
            description,
            template: "typescript",
            dependencies: {
                "@re-/tools": "latest",
                "@re-/model": "latest"
            }
        },
        {
            clickToLoad: false,
            view: "default",
            height: "100%",
            width: "100%",
            openFile: `${embedId}.ts`
        }
    )
}
