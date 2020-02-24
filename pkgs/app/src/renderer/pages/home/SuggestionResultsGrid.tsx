import React from "react"
import { SuggestionCard } from "./SuggestionCard"
import { store } from "renderer/common"
import { Card, Row, IconButton, Icons } from "@re-do/components"
import { Test } from "@re-do/model"
import { useMeQuery } from "@re-do/model/dist/react"
import { test as runTest } from "@re-do/test"

const welcomeSuggestion = {
    title: "👆Hey there!",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!",
    data: null
}

const useTestSuggestions = (): Suggestion<SuggestionKind>[] => {
    const { cardFilter } = store.useQuery({ cardFilter: true })
    const tests = useMeQuery({ fetchPolicy: "no-cache" }).data?.me?.tests
    return tests && tests.length
        ? tests
              .filter(test =>
                  JSON.stringify(test)
                      .toLowerCase()
                      .includes(cardFilter.toLowerCase())
              )
              .map(data => toSuggestion("test", data))
        : []
}

type Suggestion<Kind extends SuggestionKind> = {
    title: string
    description: string
    data: SuggestionKinds[Kind]
    extras?: JSX.Element
}

type SuggestionKinds = {
    test: Test
}

type SuggestionKind = keyof SuggestionKinds

const toSuggestion = <Kind extends SuggestionKind>(
    kind: Kind,
    data: SuggestionKinds[Kind]
): Suggestion<Kind> => {
    const suggestionTypes = {
        test: (test: Test) => ({
            title: test.name,
            description: test.tags.map(_ => _.name).join(", "),
            extras: (
                <IconButton
                    Icon={Icons.run}
                    onClick={() =>
                        runTest(
                            test.steps.map(step => [step.action, step] as any)
                        )
                    }
                />
            ),
            data: test
        })
    }
    return suggestionTypes[kind](data)
}

export const SuggestionResultsGrid = () => {
    const values = useTestSuggestions()
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
                {values.length ? (
                    values.map(value => (
                        <div
                            key={value.title}
                            style={{
                                width: 200,
                                height: 200
                            }}
                        >
                            <SuggestionCard {...value} />
                        </div>
                    ))
                ) : (
                    <SuggestionCard {...welcomeSuggestion} />
                )}
            </Row>
        </Card>
    )
}
