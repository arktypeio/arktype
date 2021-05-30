import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    ApolloLink
} from "@apollo/client"
import { ipcRenderer } from "electron"
import { createRendererStore, Root } from "state"
import { ActionData } from "../../../statelessly/dist/cjs"

const httpLink = createHttpLink({
    uri:
        process.env.NODE_ENV === "development"
            ? `http://localhost:${process.env.GRAPHQL_SERVER_PORT}/dev/graphql`
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

ipcRenderer.on("redux-action", async (event, action: ActionData<Root>) => {
    const rendererActions = action.payload
    console.log(JSON.stringify(rendererActions, null, 4))
    if (rendererActions) {
        for (const entry in Object.entries(rendererActions)) {
            const [name, args] = entry
            await (store as any)[name](...(args as any))
        }
    }
})

export const store = createRendererStore({})
