import { getMetadataStorage } from "type-graphql/dist/metadata/getMetadataStorage"
import { FieldMetadata } from "type-graphql/dist/metadata/definitions"
import { join } from "path"

export const defaultPath = join(__dirname, "generated.schema.prisma")

export type GenerateSchemaOptions = {
    atPath?: string
}

export const generateSchema = ({
    atPath = defaultPath
}: GenerateSchemaOptions) => {
    const data = getMetadataStorage()
    data.build()
    const { objectTypes } = data
    const schemaModels = objectTypes.map(({ name, fields = [] }) => [
        name,
        fields.map(field => schemaText(field))
    ])
    console.log(JSON.stringify(schemaModels, null, 4))
}

const schemaText = (field: FieldMetadata) =>
    `${field.name} ${typeName(field)}${field}`

const typeName = ({ getType }: FieldMetadata) => (getType() as any).name
