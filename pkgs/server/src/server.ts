import "dotenv/config"
import { ApolloServer } from "apollo-server-lambda"
import { getUserId } from "./auth"
import { schema } from "./schema"
import { playground } from "./playground"
import { Photon } from "@prisma/photon"

const photon = new Photon()

export const server = new ApolloServer({
    schema,
    context: ({ req }: any) => ({
        ...req,
        userId: getUserId(req),
        photon
    }),
    playground,
    introspection: true,
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
            console.log(JSON.stringify(response, null, 4))
        }
        return response
    }
})
