import { codegen } from "@graphql-codegen/core"
import { buildSchema, printSchema, parse } from "graphql"
import * as typescript from "@graphql-codegen/typescript"
import * as reactApollo from "@graphql-codegen/typescript-react-apollo"
import gql from "graphql-tag"
import { join } from "path"
const operations = require("@graphql-codegen/typescript-operations")

export const typify = async (schemaContents: string, generated: string) => {
    const schema = buildSchema(schemaContents)
    return await codegen({
        filename: generated,
        schema: parse(printSchema(schema)),
        plugins: [
            {
                typescript: {},
                reactApollo: {},
                operations: {}
            }
        ],
        pluginMap: {
            typescript,
            reactApollo,
            operations
        },
        documents: [
            {
                content: parse(`
                    mutation signIn($email: String!, $password: String!) {
                        signIn(data: { email: $email, password: $password })
                    }
                `),
                filePath: ""
            }
        ],
        config: {}
    })
}
