import "dotenv/config"
import "reflect-metadata"
import { ApolloServer } from "apollo-server"
import { buildSchema } from "type-graphql"
import { authChecker, getUserId } from "./auth"
import { resolvers } from "./resolvers"
import Photon from "@generated/photon"

const photon = new Photon()

const serve = async () => {
    const schema = await buildSchema({ resolvers, authChecker })

    const server = new ApolloServer({
        schema,
        context: ({ req }: any) => ({
            ...req,
            id: getUserId(req),
            photon
        }),
        playground: {
            tabs: [
                {
                    query: "someNew"
                }
            ]
        },
        debug: true,
        formatError: error => {
            console.log(error)
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

    const { url } = await server.listen({ port: process.env.PORT })
    console.log(`Redo's Apollo server is up and running at ${url}.`)
}

serve()
