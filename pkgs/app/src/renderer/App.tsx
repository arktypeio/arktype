import "typeface-ubuntu"
import React from "react"
import { ThemeProvider } from "@material-ui/styles"
import { ApolloProvider } from "react-apollo"
import { ApolloProvider as ApolloHooksProvider } from "@apollo/react-hooks"
import { ApolloClient } from "apollo-client"
import { CssBaseline, Theme } from "@material-ui/core"
import { StatelessProvider } from "react-statelessly"
import { Root } from "state"
import { Content } from "./Content"
import { store } from "./common"

export type AppProps = {
    apolloClient: ApolloClient<Root>
    theme: Theme
}

export const App = ({ apolloClient, theme }: AppProps) => (
    <ApolloProvider client={apolloClient}>
        <ApolloHooksProvider client={apolloClient}>
            <StatelessProvider store={store}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <Content />
                </ThemeProvider>
            </StatelessProvider>
        </ApolloHooksProvider>
    </ApolloProvider>
)
