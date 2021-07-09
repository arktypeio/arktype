import { createFileDb, FileDbArgs, ShallowModel } from "persist-statelessly"
import { join } from "path"
import { RedoData } from "@re-do/model"

export const defaultRedoJsonPath = join(process.cwd(), "redo.json")
export const defaultRedoData: ShallowModel<RedoData, "id"> = {
    tests: [],
    elements: [],
    steps: [],
    tags: []
}

export const createRedoFileDb = (opts: Partial<FileDbArgs<RedoData>>) =>
    createFileDb<RedoData>({
        path: defaultRedoJsonPath,
        onNoFile: () => defaultRedoData,
        relationships: {
            tests: {
                steps: "steps",
                tags: "tags"
            },
            elements: {},
            steps: {
                element: "elements"
            },
            tags: {}
        },
        reuseExisting: {
            elements: true,
            steps: true,
            tags: true
        },
        validate: (state, { store }) => {
            return true
        },
        ...opts
    })
