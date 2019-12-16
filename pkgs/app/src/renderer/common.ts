import { ApolloClient } from "apollo-client"
import { InMemoryCache } from "apollo-cache-inmemory"
import { createHttpLink } from "apollo-link-http"
import { rootHandler, initialRoot } from "state"
import { createStore } from "react-statelessly"
import { setContext } from "apollo-link-context"

const httpLink = createHttpLink({ uri: `http://localhost:${process.env.PORT}` })
const contextLink = setContext(() => ({
    headers: { authorization: `Bearer ${store.query({ token: true }).token}` }
}))

export const client = new ApolloClient({
    link: contextLink.concat(httpLink),
    cache: new InMemoryCache()
})
export const store = createStore({
    initial: initialRoot,
    handler: rootHandler
})
