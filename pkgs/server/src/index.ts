import "dotenv/config"
import "reflect-metadata"
import { ApolloServer } from "apollo-server"
import { getUserId } from "./auth"
import { schema } from "./schema"
import { playground } from "./playground"
import { Photon } from "@prisma/photon"

const photon = new Photon()

const serve = async () => {
    const server = new ApolloServer({
        schema,
        context: ({ req }: any) => ({
            ...req,
            userId: getUserId(req),
            photon
        }),
        playground,
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
                console.log(JSON.stringify(response, null, 4))
            }
            return response
        }
    })
    const { url } = await server.listen({ port: process.env.PORT })
    console.log(`Redo's Apollo server is up and running at ${url} 🚀`)
}

serve()
