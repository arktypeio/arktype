import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    ApolloLink
} from "@apollo/client"
import { stateSyncEnhancer } from "electron-redux/renderer"
import { Root } from "common"
import { Store } from "react-statelessly"

const uri = import.meta.env.DEV
    ? `http://localhost:${import.meta.env.VITE_GRAPHQL_SERVER_PORT}/dev/graphql`
    : "https://tpru7v18yi.execute-api.us-east-1.amazonaws.com/dev/graphql"

const httpLink = createHttpLink({ uri })

const contextLink = new ApolloLink((operation, forward) => {
    operation.setContext({
        headers: {
            authorization: `Bearer ${store.get("token")}`
        }
    })
    return forward(operation)
})

export const client = new ApolloClient({
    link: contextLink.concat(httpLink),
    cache: new InMemoryCache()
})

export const store = new Store(
    {} as Root,
    {},
    {
        reduxOptions: {
            enhancers: (enhancers) => [stateSyncEnhancer()].concat(enhancers)
        }
    }
)

// Test hook
store.update({ main: { __rendererLaunched: [] } })
