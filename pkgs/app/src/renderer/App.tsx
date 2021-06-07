import React from "react"
import { ApolloProvider } from "@apollo/client"
import { DefaultTheme } from "@re-do/components"
import { StatelessProvider } from "react-statelessly"
import { Router } from "./Router"
import { store, client } from "./common"

export const App = () => (
    <ApolloProvider client={client}>
        <StatelessProvider store={store}>
            <DefaultTheme>
                <Router />
            </DefaultTheme>
        </StatelessProvider>
    </ApolloProvider>
)
