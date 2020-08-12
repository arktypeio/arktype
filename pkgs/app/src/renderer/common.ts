import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    ApolloLink
} from "@apollo/client"
import { rootHandler, initialRoot } from "state"
import { createStore } from "react-statelessly"
import { isDev } from "@re-do/utils/dist/node"

const httpLink = createHttpLink({
    uri: isDev()
        ? `http://localhost:${process.env.PORT}/dev/graphql`
        : "https://tpru7v18yi.execute-api.us-east-1.amazonaws.com/dev/graphql"
})

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
