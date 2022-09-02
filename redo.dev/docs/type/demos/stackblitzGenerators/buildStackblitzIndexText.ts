import { EmbedId } from "./createStackblitzDemo"

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
        `import {fetchUser, error, user} from "./type"`,
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
        `import {mySpace, fetchGroupData, error } from "./declaration"`,
        "{data: fetchGroupData(), definition: mySpace.inputs.dictionary, error}"
    ]
}
