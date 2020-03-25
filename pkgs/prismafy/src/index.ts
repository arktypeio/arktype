import { objectType } from "nexus"
import { getDefaultClientPath } from "redo-nexus-prisma/dist/builder"
import { getTransformedDmmf } from "redo-nexus-prisma/dist/dmmf"

export type PrismafyOptions = {
    clientPath?: string
}

const addDefaults = (
    options: PrismafyOptions = {}
): Required<PrismafyOptions> => ({
    clientPath: getDefaultClientPath(),
    ...options,
})

export const prismafy = (options?: PrismafyOptions) => {
    const { clientPath } = addDefaults(options)
    const dmmf = getTransformedDmmf(clientPath)
    return dmmf.datamodel.models.map(({ name, fields }) => {
        return objectType({
            name,
            definition: (t) => {
                fields.forEach(({ name }) => (t as any).model[name]())
            },
        })
    })
}
