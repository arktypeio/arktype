import type { EmbedId } from "./createStackblitzDemo"

export const buildStackblitzIndexText = (embedId: EmbedId) => {
    const demoInfo = demoAdapters[embedId]
    const fileImports = demoInfo[0]
    const dataObject = demoInfo[1]

    return `import {populateDemo} from "./populateDemo"
(async () => {
    try {
        ${fileImports}
        populateDemo(${dataObject})
    } catch(e) {
        populateDemo({ 
            type: {
                definition: ""
            },
            data: "",
            problems: "ParseError: " + e.originalErr.message
          } as any)
    }
})()`
}

type DemoAdapter = [importFromDemo: string, dataFromImports: string]

const demoAdapters: Record<EmbedId, DemoAdapter> = {
    type: [
        `const { user, data, problems } = await import("./type")`,
        `{ type: user, data, problems }`
    ],
    scope: [
        `const { types, data, problems } = await import("./scope")`,
        "{ type: types.package, data, problems }"
    ]
}
