import "isomorphic-fetch"
import ApolloBoostClient, { ApolloClientOptions } from "apollo-boost"

export type ApolloClientOrOptions<T> =
    | ApolloBoostClient<T>
    | ApolloClientOptions<T>

export const getApolloClient = <T>(from?: ApolloClientOrOptions<T>) =>
    from instanceof ApolloBoostClient ? from : new ApolloBoostClient(from)

export type ApolloClient = ApolloBoostClient<any>
