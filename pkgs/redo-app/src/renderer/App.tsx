import React from "react"
import { Content } from "./Content"
import { ThemeProvider } from "@material-ui/styles"
import { ApolloProvider } from "react-apollo"
import { ApolloProvider as ApolloHooksProvider } from "@apollo/react-hooks"
import { ApolloClient } from "apollo-client"
import { CssBaseline, Theme } from "@material-ui/core"
import { Root } from "state"
import { component } from "blocks"

export type AppProps = {
    apolloClient: ApolloClient<Root>
    theme: Theme
}

export const App = component({
    name: "App",
    defaultProps: {} as Partial<AppProps>
})(({ apolloClient, theme }) => (
    <ApolloProvider client={apolloClient}>
        <ApolloHooksProvider client={apolloClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Content />
            </ThemeProvider>
        </ApolloHooksProvider>
    </ApolloProvider>
))
