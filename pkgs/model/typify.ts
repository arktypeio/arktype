import { codegen } from "@graphql-codegen/core"
import { Types } from "@graphql-codegen/plugin-helpers"
import { buildSchema, printSchema, parse } from "graphql"
import { readFileSync, writeFileSync } from "fs-extra"
import * as typescript from "@graphql-codegen/typescript"
import * as reactApollo from "@graphql-codegen/typescript-react-apollo"
const operations = require("@graphql-codegen/typescript-operations")
import { gqlize } from "gqlize"
import { join } from "path"

export const typify = async () => {
    const schemaFile = join(__dirname, "schema.gql")
    const schema = buildSchema(readFileSync(schemaFile).toString())
    const baseFileName = join(__dirname, "src", "model.ts")
    const baseOptions: Types.GenerateOptions = {
        filename: baseFileName,
        schema: parse(printSchema(schema)),
        plugins: [
            {
                typescript: {}
            }
        ],
        pluginMap: {
            typescript
        },
        documents: [
            {
                content: parse(gqlize({ schema: schemaFile })),
                filePath: ""
            }
        ],
        config: {}
    }
    const baseTypes = await codegen(baseOptions)
    writeFileSync(baseFileName, baseTypes)
    const reactFileName = join(__dirname, "src", "react.tsx")
    const reactOptions = {
        ...baseOptions,
        filename: reactFileName,
        plugins: [
            ...baseOptions.plugins,
            { operations: {} },
            {
                reactApollo: {
                    withComponent: false,
                    withHOC: false,
                    withHooks: true,
                    reactApolloVersion: 3
                }
            }
        ],
        pluginMap: {
            ...baseOptions.pluginMap,
            reactApollo,
            operations
        }
    }
    const reactTypes = await codegen(reactOptions)
    writeFileSync(reactFileName, reactTypes)
}
typify()
