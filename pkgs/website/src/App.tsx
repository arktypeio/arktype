import React from "react"
import { AppContents, DefaultTheme } from "@re-do/components"
import { ApolloProvider, ApolloClient, InMemoryCache } from "@apollo/client"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import { Home, Blog } from "./pages"

export const client = new ApolloClient({
    uri: import.meta.env.DEV
        ? `http://localhost:${
              import.meta.env.VITE_GRAPHQL_SERVER_PORT
          }/dev/graphql`
        : "https://tpru7v18yi.execute-api.us-east-1.amazonaws.com/dev/graphql",
    cache: new InMemoryCache()
})

export const App = () => {
    return (
        <ApolloProvider client={client}>
            <DefaultTheme>
                <AppContents>
                    <Router>
                        <Switch>
                            <Route exact path="/" component={Home} />
                            <Route path="/blog" component={Blog} />
                        </Switch>
                    </Router>
                </AppContents>
            </DefaultTheme>
        </ApolloProvider>
    )
}
