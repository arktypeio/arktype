import "dotenv/config"
import "reflect-metadata"
import { ApolloServer } from "apollo-server"
import { buildSchema } from "type-graphql"
import { prisma } from "./database"
import { authChecker, getUserId } from "./auth"
import { resolvers } from "./resolvers"

const serve = async () => {
    const schema = await buildSchema({ resolvers, authChecker })

    const server = new ApolloServer({
        schema,
        context: ({ req }: any) => ({
            ...req,
            userId: getUserId(req),
            prisma
        }),
        debug: true,
        formatError: error => {
            console.log(error)
            return error
        },
        formatResponse: (response: any) => {
            console.log(response)
            return response
        }
    })

    const { url } = await server.listen({ port: process.env.PORT })
    console.log(`Redo's Apollo server is up and running at ${url}.`)
}

serve()
