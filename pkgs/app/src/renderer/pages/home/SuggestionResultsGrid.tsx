import React from "react"
import { Unlisted } from "@re-do/utils"
import { SuggestionCard } from "./SuggestionCard.js"
import { store } from "renderer/common"
import { Card, Row, Button, Icons } from "@re-do/components"
import { Test } from "@re-do/model"
import type { ShallowWithId } from "persist-statelessly"

const welcomeSuggestion = {
    title: "👆Hey there!",
    description:
        "Looks like you don't have any tests yet. Click up here to create one!",
    data: null
}

const useSuggestions = (): Suggestion<UserItemKind>[] => {
    const {
        cardFilter,
        data: { tests }
    } = store.useQuery({
        cardFilter: true,
        data: {
            tests: true
        }
    })
    return tests && tests.length
        ? tests
              .filter((test) =>
                  JSON.stringify(test)
                      .toLowerCase()
                      .includes(cardFilter.toLowerCase())
              )
              .map((data) => toSuggestion("tests", data as any))
        : []
}

type UserData = { tests: ShallowWithId<Test, "id"> }

type UserItemKind = keyof UserData

type UserItem<Kind extends UserItemKind> = Unlisted<UserData[Kind]>

type Suggestion<Kind extends UserItemKind> = {
    title: string
    description: string
    data: UserItem<Kind>
    extras?: JSX.Element
}

const suggestionTypes = {
    tests: (test: UserItem<"tests">) => {
        return {
            title: test.name,
            description: test.tags.join(", "),
            extras: (
                <Button
                    Icon={Icons.run}
                    onClick={() =>
                        store.update({ main: { runTest: [test.id] } })
                    }
                />
            ),
            data: test
        }
    }
}

type SuggestionTypes = typeof suggestionTypes
type SuggestionKind = keyof SuggestionTypes

const toSuggestion = <Kind extends SuggestionKind>(
    kind: Kind,
    data: UserItem<Kind>
): Suggestion<Kind> => {
    return suggestionTypes[kind](data) as Suggestion<Kind>
}

export const SuggestionResultsGrid = () => {
    const values = useSuggestions()
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
                    values.map((value, index) => (
                        <div
                            key={index}
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
