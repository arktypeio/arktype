import sdk from "@stackblitz/sdk"

export type DemoProps = {
    embedId: "model" | "space" | "declaration" | "constraints"
    elementId: string
}
export enum Template {
    ts = "typescript"
}

type DemoArgs = {
    files: Record<string, string>
    title: string
    description: string
    template: Template
    embedId: "model" | "space" | "declaration" | "constraints"
    elementId: string
}
export const createStackblitzDemo = ({
    files,
    title,
    description,
    template,
    embedId,
    elementId
}: DemoArgs) => {
    sdk.embedProject(
        elementId,
        {
            files,
            title,
            description,
            template,
            dependencies: {
                "@re-/tools": "latest",
                "@re-/model": "2.0.3-alpha",
                typescript: "latest"
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
