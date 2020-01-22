import React from "react"
import { SuggestionCard } from "./SuggestionCard"
import { store } from "renderer/common"
import { Card, Row } from "@re-do/components"
import { Test } from "@re-do/model"
import { useMeQuery } from "@re-do/model/dist/react"
import gql from "graphql-tag"

const welcomeSuggestion = {
    name: "👆Hey there!",
    kind: "other",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!"
}

const useValues = () => {
    const { cardFilter } = store.useQuery({ cardFilter: true })
    const tests = useMeQuery({ fetchPolicy: "no-cache" }).data?.me?.tests
    return tests && tests.length > 0
        ? tests
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
