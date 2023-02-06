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
            definition: {},
            data: {},
            error: "ParseError: " + e.originalErr.message,
          })
    }
})()`
}

type DemoAdapter = [importFromDemo: string, dataFromImports: string]

const demoAdapters: Record<EmbedId, DemoAdapter> = {
    type: [
        `const { user, data, problems } = await import("./type")`,
        `{ definition: user.definition, data, error: problems?.summary }`
    ],
    scope: [
        `const { types, data, problems } = await import("./scope")`,
        "{ definition: types.package.meta.definition, data, error: problems?.summary }"
    ]
}
