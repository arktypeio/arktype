import React from "react"
import { SuggestionCard } from "./SuggestionCard"
import { store } from "renderer/common"
import { Card, Row } from "@re-do/components"
import { useQuery } from "@apollo/client"
import { Test } from "@re-do/model"
import gql from "graphql-tag"

const welcomeSuggestion = {
    name: "👆Hey there!",
    kind: "other",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!"
}

const useValues = () => {
    const { cardFilter } = store.useQuery({ cardFilter: true })
    const { data, loading } = useQuery<{ tests: Test[] }>(
        gql`
            query tests {
                tests {
                    name
                    steps {
                        action
                        value
                        selector {
                            css
                        }
                    }
                    tags {
                        name
                    }
                }
            }
        `,
        { fetchPolicy: "no-cache" }
    )
    return loading
        ? []
        : data?.tests && data.tests.length > 0
        ? data.tests
              .filter(test =>
                  JSON.stringify(test)
                      .toLowerCase()
                      .includes(cardFilter.toLowerCase())
              )
              .map(test => ({ ...test, description: "Test" }))
        : [welcomeSuggestion]
}

export const SuggestionResultsGrid = () => {
    const values = useValues() as Array<
        (Test & { description: string }) | typeof welcomeSuggestion
    >
    return (
        <Card
            style={{
                width: "100%",
                height: "100%"
            }}
        >
            <Row
                wrap="wrap"
                style={{
                    width: "100%",
                    padding: 16
                }}
            >
                {values.map(value => (
                    <div
                        key={value.name}
                        style={{
                            width: 200,
                            height: 200
                        }}
                    >
                        <SuggestionCard
                            kind={"steps" in value ? "test" : "other"}
                            value={value}
                        />
                    </div>
                ))}
            </Row>
        </Card>
    )
}
