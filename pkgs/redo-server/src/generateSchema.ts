import { getMetadataStorage } from "type-graphql/dist/metadata/getMetadataStorage"
import { join } from "path"

export const defaultPath = join(__dirname, "..", "prisma", "schema.prisma")

export type GenerateSchemaOptions = {
    atPath?: string
}

export const generateSchema = ({
    atPath = defaultPath
}: GenerateSchemaOptions) => {
    const data = getMetadataStorage()
    const { objectTypes } = data
    const schemaModels = objectTypes.map(o => {
        return o
    })
    console.log(JSON.stringify(schemaModels))
}
