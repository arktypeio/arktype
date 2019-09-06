import React, { ReactNode } from "react"
import { ApolloClient } from "apollo-client"
import { InMemoryCache, InMemoryCacheConfig } from "apollo-cache-inmemory"
import { createHttpLink, HttpLink } from "apollo-link-http"
import { ApolloProvider, useQuery as useApolloQuery } from "@apollo/react-hooks"

type ClientOptions = {
    link?: HttpLink.Options
    cache?: InMemoryCacheConfig
}

const createClient = ({ link, cache }: ClientOptions) =>
    new ApolloClient({
        link: createHttpLink(link),
        cache: new InMemoryCache(cache)
    })

type ShapeQlContextProps<T> = {
    children: ReactNode
    apolloClientOptions: ClientOptions
}
export const ShapeQlProvider = <T extends any>({
    children,
    apolloClientOptions
}: ShapeQlContextProps<T>) => {
    const client = createClient(apolloClientOptions)
    // TODO: Create a custom ShapeQL context, use ApolloContext implementation as reference
    return <ApolloProvider client={client}>{children}</ApolloProvider>
}

const useQuery = () => {}
