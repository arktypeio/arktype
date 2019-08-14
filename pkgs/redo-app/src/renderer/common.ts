import { ApolloClient, Resolvers } from "apollo-client"
import { InMemoryCache } from "apollo-cache-inmemory"
import { createHttpLink } from "apollo-link-http"
import { Root, Learner, Bounds, rootHandler } from "state"
import { buildSchemaSync, Resolver } from "type-graphql"
import { createResolversMap } from "type-graphql/dist/utils/createResolversMap"
import { printSchema } from "graphql"
import { createStore } from "shapeql"
import { setContext } from "apollo-link-context"

const httpLink = createHttpLink({ uri: `http://localhost:${process.env.PORT}` })
const contextLink = setContext(() => ({
    headers: { authorization: `Bearer ${store.query({ token: null }).token}` }
}))

export const cache = new InMemoryCache({ addTypename: false })
export const client = new ApolloClient({
    link: contextLink.concat(httpLink),
    cache
})
export const store = createStore({
    rootClass: Root,
    client: client as any,
    handler: rootHandler
})
