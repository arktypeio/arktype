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
        `const { user, fetchUser, errors } = await import("./type")`,
        `{ definition: user.definition, data: fetchUser(), error: errors?.summary }`
    ],
    scope: [
        `const { types, readPackageData, errors } = await import("./scope")`,
        "{ definition: types.$root.dictionary, data: readPackageData(), error: errors?.summary }"
    ]
}
