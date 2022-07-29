import { EmbedId } from "./stackblitzDemoBuilder"

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
    model: [
        `import {fetchUser, error, user} from "./model"`,
        `{data: fetchUser(), error, definition: user.definition}`
    ],
    space: [
        `import {readPackageData, getValidatedPackageData, redo} from "./space"
let error
try{
    getValidatedPackageData()
}catch(e){
    error = e
}`,
        "{data: readPackageData(), definition: redo.inputs.dictionary, error }"
    ],
    constraints: [
        `import {employee, fetchEmployee, error} from "./constraints"`,
        "{data: fetchEmployee(), definition: employee.definition, error }"
    ],
    declaration: [
        `import {define, compile, mySpace} from "./declaration"`,
        "{data: define, definition: compile, error: mySpace}"
    ]
}
