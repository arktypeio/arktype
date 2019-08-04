import React, { FC } from "react"
import { HomeActionsRow, SuggestionResultsGrid } from "custom"
import { Column, Row, SecondaryButton } from "redo-components"
import { suggestionData } from "custom/FakeSuggestions"
import { store } from "renderer/common"
import { Page } from "renderer/state"

export const Home: FC = () => {
    return (
        <Column justify="flex-start">
            <Row>
                <SecondaryButton
                    onClick={() => store.mutate({ page: Page.TestView })}
                >
                    See all tests
                </SecondaryButton>
                <HomeActionsRow />
            </Row>
            <SuggestionResultsGrid suggestions={suggestionData} />
        </Column>
    )
}
