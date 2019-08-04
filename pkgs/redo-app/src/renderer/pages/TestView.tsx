import React from "react"
import { HomeActionsRow, SuggestionResultsGrid } from "custom"
import { Column, Row, SecondaryButton, ContentCard } from "redo-components"
import { suggestionData } from "custom/FakeSuggestions"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"
import { User } from "redo-model"

const GET_TESTS = gql`
    query {
        getTest {
            name
            user {
                email
            }
        }
    }
`

type TestData = {
    getTest: {
        name: string
        user: User
    }[]
}

export const TestView = () => {
    const { data } = useQuery<TestData>(GET_TESTS)
    return (
        <Column justify="flex-start">
            <Row>
                <SecondaryButton
                    onClick={() => store.mutate({ page: Page.Home })}
                >
                    Home
                </SecondaryButton>
                <HomeActionsRow />
            </Row>
            <ContentCard
                from={
                    data && data.getTest
                        ? data.getTest.reduce(
                              (tests, { name, user }) => {
                                  tests[name] = JSON.stringify(user)
                                  return tests
                              },
                              {} as any
                          )
                        : {}
                }
            />
        </Column>
    )
}
