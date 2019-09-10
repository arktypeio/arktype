import "isomorphic-fetch"
import ApolloClient, { ApolloClientOptions } from "apollo-boost"

export type ApolloClientOrOptions<T> = ApolloClient<T> | ApolloClientOptions<T>

export const getApolloClient = <T>(from?: ApolloClientOrOptions<T>) =>
    from instanceof ApolloClient ? from : new ApolloClient(from)

export type ApolloClient = ApolloClient<any>
