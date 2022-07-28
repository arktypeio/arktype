export const stackblitzIndexFileBuilder = (embedId: string) => {
    const demoInfo = demoAdapters[embedId]
    const fileImports = demoInfo[0]
    const dataObject = demoInfo[1]

    return `import {populateDemo} from "./populateDemo"
${fileImports}
populateDemo(${dataObject})`
}

const demoAdapters: Record<string, string[]> = {
    model: [
        `import {fetchUser, error, user} from "./model"`,
        `{data: fetchUser(), error, type: user.definition}`
    ],
    space: [
        `import {readPackageData, getValidatedPackageData, redo} from "./space"`,
        "{data: readPackageData(), definition: redo, error: getValidatedPackageData }"
    ],
    constraints: [
        `import {employee, error} from "./constraints"`,
        "{data: {}, definition: employee.definition, error}"
    ],
    declaration: [
        `import {define, compile, mySpace} from "./declaration"`,
        "{data: define, definition: compile, error: mySpace}"
    ]
}
