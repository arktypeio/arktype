import { writeFileSync } from "fs"
import { join } from "path"
import { printSchema } from "graphql"
import { buildSchemaSync, BuildSchemaOptions } from "type-graphql"

const excludedFromModel = ["Query", "Mutation"]

export const defaultPath = join(
    __dirname,
    "database",
    "generated",
    "datamodel.prisma"
)

export type ModelOptions = {
    atPath?: string
} & BuildSchemaOptions

export const generateModel = ({
    atPath = defaultPath,
    ...schemaOptions
}: ModelOptions) => {
    const schema = buildSchemaSync(schemaOptions)
    const map = schema.getTypeMap()
    excludedFromModel.forEach(type => {
        delete map[type]
    })
    const schemaLines = printSchema(schema).split("\n")
    const schemaLinesWithUniqueIds = schemaLines.map(line =>
        line.includes("id") || line.includes("email") ? line + " @unique" : line
    )
    writeFileSync(atPath, schemaLinesWithUniqueIds.join("\n"))
}
