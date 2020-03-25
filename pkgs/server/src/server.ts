import "dotenv/config"
import { ApolloServer } from "apollo-server-lambda"
import { getUserId } from "./auth"
import { schema } from "./schema"
import { playground } from "./playground"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const server = new ApolloServer({
    schema,
    context: ({ event }: any) => {
        if (!event) {
            throw new Error(
                `Expected an 'event' property on the object passed to context. Received:\n${JSON.stringify(
                    event,
                    null,
                    4
                )}`
            )
        }
        return {
            ...event,
            userId: getUserId(event),
            prisma,
        }
    },
    playground,
    introspection: true,
    debug: true,
    formatError: (error) => {
        console.log(JSON.stringify(error, null, 4))
        return error
    },
    formatResponse: (response: any) => {
        // Don't log spammy queries from graphql playground
        if (
            response.data &&
            !Object.keys(response.data).every((key) => key === "__schema")
        ) {
            console.log(JSON.stringify(response, null, 4))
        }
        return response
    },
})
