import "typeface-ubuntu"
import React from "react"
import { ApolloClient, ApolloProvider } from "@apollo/client"
import { DefaultTheme } from "@re-do/components"
import { StatelessProvider } from "react-statelessly"
import { Root } from "state"
import { Content } from "./Content"
import { store } from "./common"

export type AppProps = {
    apolloClient: ApolloClient<Root>
}

export const App = ({ apolloClient }: AppProps) => (
    <ApolloProvider client={apolloClient}>
        <StatelessProvider store={store}>
            <DefaultTheme>
                <Content />
            </DefaultTheme>
        </StatelessProvider>
    </ApolloProvider>
)
