import { server } from "./server"
import { ApolloServer } from "apollo-server-lambda"

export const handler: ReturnType<ApolloServer["createHandler"]> = server.createHandler(
    {
        cors: {
            origin: "*",
            credentials: true
        }
    }
)
