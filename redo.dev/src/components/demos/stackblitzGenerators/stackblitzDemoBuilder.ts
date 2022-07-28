import sdk from "@stackblitz/sdk"

export type EmbedId =
    | "model"
    | "space"
    | "constraints"
    | "declaration"
    | "user"
    | "group"

export type DemoProps = {
    embedId: EmbedId
    elementId: string
}
type DemoArgs = {
    files: Record<string, string>
    title: string
    description: string
    embedId: EmbedId
    elementId: string
}
export const createStackblitzDemo = ({
    files,
    title,
    description,
    embedId,
    elementId
}: DemoArgs) => {
    sdk.embedProject(
        elementId,
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
