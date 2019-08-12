import { getMetadataStorage } from "type-graphql/dist/metadata/getMetadataStorage"
import { FieldMetadata } from "type-graphql/dist/metadata/definitions"
import { ObjectClassMetadata } from "type-graphql/dist/metadata/definitions/object-class-metdata"
import { join } from "path"
import { writeFileSync } from "fs"

export const defaultPath = join(
    __dirname,
    "..",
    "..",
    "prisma",
    "schema.prisma"
)

export const baseSchema = `datasource db {
  provider = "sqlite"
  url      = "file:dev.db"
  default  = true
}

generator photon {
  provider = "photonjs"
}

`

export type GenerateSchemaOptions = {
    atPath?: string
}

export const generateSchema = ({
    atPath = defaultPath
}: GenerateSchemaOptions) => {
    const data = getMetadataStorage()
    data.build()
    const { objectTypes } = data
    const models = objectTypes.reduce(
        (modelString, obj) => `${modelString}${schemifyObject(obj)}`,
        ""
    )
    writeFileSync(atPath, `${baseSchema}${models}`)
}

const schemifyObject = ({ name, fields = [] }: ObjectClassMetadata) => {
    const fieldLines = fields.reduce(
        (fieldLines, field) => `${fieldLines}  ${schemifyField(field)}\n`,
        ""
    )
    return `model ${name} {\n${fieldLines}}\n\n`
}

const defaultTypeDescriptions = {
    ID: "String @default(cuid()) @id @unique"
}

const schemifyField = (field: FieldMetadata) => {
    const { description, name } = field
    const suffix = description ? description : getFieldSuffix(field)
    return `${name} ${suffix}`
}

const getFieldSuffix = ({ getType, typeOptions: { array } }: FieldMetadata) => {
    const schemaType: string = `${(getType() as any).name}${array ? "[]" : ""}`
    return schemaType in defaultTypeDescriptions
        ? defaultTypeDescriptions[
              schemaType as keyof typeof defaultTypeDescriptions
          ]
        : schemaType
}
