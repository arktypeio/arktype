import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    ApolloLink
} from "@apollo/client"
import {
    forwardToMain,
    replayActionRenderer,
    getInitialStateRenderer
} from "electron-redux"
import { ipcRenderer } from "electron"
import { Root } from "common"
import { Store, ActionData } from "react-statelessly"

const httpLink = createHttpLink({
    uri:
        process.env.NODE_ENV === "development"
            ? `http://localhost:${process.env.GRAPHQL_SERVER_PORT}/dev/graphql`
            : "https://tpru7v18yi.execute-api.us-east-1.amazonaws.com/dev/graphql"
})

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
    getInitialStateRenderer<Root>(),
    {},
    { middleware: [forwardToMain] }
)

replayActionRenderer(store.underlying as any)
