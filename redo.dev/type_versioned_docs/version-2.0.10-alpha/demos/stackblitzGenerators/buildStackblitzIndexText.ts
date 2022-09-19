import type { EmbedId } from "./createStackblitzDemo"

export const buildStackblitzIndexText = (embedId: EmbedId) => {
    const demoInfo = demoAdapters[embedId]
    const fileImports = demoInfo[0]
    const dataObject = demoInfo[1]

    return `import {populateDemo} from "./populateDemo"
${fileImports}
populateDemo(${dataObject})`
}

type DemoAdapter = [importFromDemo: string, dataFromImports: string]

const demoAdapters: Record<EmbedId, DemoAdapter> = {
    type: [
        `import { user, fetchUser, errors } from "./type"`,
        `{ definition: user.definition, data: fetchUser(), error: errors.summary }`
    ],
    space: [
        `import { types, readPackageData, errors } from "./space"`,
        "{ definition: types.$root.dictionary, data: readPackageData(), error: errors.summary }"
    ],
    constraints: [
        `import { employee, queryEmployee, errors } from "./constraints"`,
        "{ definition: employee.definition, data: queryEmployee(), error: errors.summary }"
    ],
    declaration: [
        `import { types, getGroupsForCurrentUser, errors } from "./declaration"`,
        "{ definition: types.$root.dictionary, data: getGroupsForCurrentUser(), error: errors.summary }"
    ]
}
