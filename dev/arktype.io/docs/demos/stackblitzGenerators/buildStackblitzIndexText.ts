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
    space: [
        `const { types, readPackageData, errors } = await import("./space")`,
        "{ definition: types.$root.dictionary, data: readPackageData(), error: errors?.summary }"
    ],
    constraints: [
        `const { employee, queryEmployee, errors } = await import("./constraints")`,
        "{ definition: employee.definition, data: queryEmployee(), error: errors?.summary }"
    ],
    declaration: [
        `const { types, getGroupsForCurrentUser, errors } = await import("./declaration")`,
        "{ definition: types.$root.dictionary, data: getGroupsForCurrentUser(), error: errors?.summary }"
    ]
}
