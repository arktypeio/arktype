import { server } from "./server"
import { ApolloServer } from "apollo-server-lambda"

export const handler: ReturnType<ApolloServer["createHandler"]> = server.createHandler(
    {
        cors: {
            origin: "*",
            credentials: true,
            allowedHeaders: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Apollo-Tracing,x-apollo-tracing`
        }
    }
)
