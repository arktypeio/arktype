import React from "react"
import { ApolloProvider } from "@apollo/client"
import { DefaultTheme } from "@re-do/components"
import { StatelessProvider } from "react-statelessly"
import { Router } from "./Router.js"
import { store, client } from "renderer/common"

export const App = () => (
    <ApolloProvider client={client}>
        <StatelessProvider store={store}>
            <DefaultTheme>
                <Router />
            </DefaultTheme>
        </StatelessProvider>
    </ApolloProvider>
)
