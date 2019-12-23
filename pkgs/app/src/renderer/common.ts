import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    ApolloLink
} from "@apollo/client"
import { rootHandler, initialRoot } from "state"
import { createStore } from "react-statelessly"

const httpLink = createHttpLink({ uri: `http://localhost:${process.env.PORT}` })
const contextLink = new ApolloLink((operation, forward) => {
    operation.setContext({
        headers: {
            authorization: `Bearer ${store.query({ token: true }).token}`
        }
    })
    return forward(operation)
})

export const client = new ApolloClient({
    link: contextLink.concat(httpLink),
    cache: new InMemoryCache()
})
export const store = createStore({
    initial: initialRoot,
    handler: rootHandler
})
