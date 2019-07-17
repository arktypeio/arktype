import React from "react"
import { component } from "blocks"
import { Query } from "react-apollo"
import { DocumentNode } from "graphql"

export type QuerySwitchProps<
    V extends NonNullable<any> | undefined = undefined
> = {
    cases: Record<string, React.ReactElement>
    defaultCase?: React.ReactElement
    variables?: V
}

export const createQuerySwitch = <R, K extends string, V>(
    gql: DocumentNode,
    resultToCase: (_: R) => K
) =>
    component({
        name: "QuerySwitch",
        defaultProps: {} as Partial<QuerySwitchProps<V>>
    })(({ cases, defaultCase, variables }) => {
        return (
            <Query<R, V> query={gql} variables={variables as any}>
                {({ loading, error, data }) => {
                    if (data) {
                        const searchKey = resultToCase(data)
                        const keys = Object.keys(cases)
                        if (!keys.includes(String(searchKey))) {
                            if (defaultCase) {
                                return defaultCase
                            }
                            throw Error(
                                `Expected your query to result in one of the following:\n${keys.join(
                                    ", "
                                )}.\nGot ${searchKey}.`
                            )
                        }
                        return cases[searchKey]
                    } else if (error) {
                        throw Error(
                            `Encountered the following error when running your query:\n${error}.`
                        )
                    }
                }}
            </Query>
        )
    })
