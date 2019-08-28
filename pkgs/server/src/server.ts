import "dotenv/config"
import "reflect-metadata"
import { join } from "path"
import { ApolloServer } from "apollo-server-lambda"
import { buildSchemaSync } from "type-graphql"
import Photon from "@generated/photon"
import { authChecker, getUserId } from "./auth"
import { resolvers } from "./resolvers"
import { playground } from "./playground"

const photon = new Photon()

export const schema = buildSchemaSync({
    resolvers,
    authChecker,
    emitSchemaFile: {
        path: join(__dirname, "playground", "schema.gql"),
        commentDescriptions: false
    }
})

export const server = new ApolloServer({
    schema,
    context: ({ req }: any) => ({
        ...req,
        id: getUserId(req),
        photon
    }),
    playground,
    debug: true,
    formatError: error => {
        console.log(JSON.stringify(error, null, 4))
        return error
    },
    formatResponse: (response: any) => {
        // Don't log spammy queries from graphql playground
        if (
            response.data &&
            !Object.keys(response.data).every(key => key === "__schema")
        ) {
            console.log(JSON.stringify(response))
        }
        return response
    }
})
