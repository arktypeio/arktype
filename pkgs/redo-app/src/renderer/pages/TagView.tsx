import React from "react"
import { HomeActionsRow } from "custom"
import { Column, Row, SecondaryButton, Tree } from "redo-components"
import { useQuery } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { Page } from "renderer/state"

import gql from "graphql-tag"

const GET_TAGS = gql`
    query {
        getTag {
            name
        }
    }
`

type TagData = {
    getTag: {
        name: string
    }[]
}

export const TagView = () => {
    const { data } = useQuery<TagData>(GET_TAGS)
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
            {data && data.getTag ? (
                <Tree from={data.getTag} labelKey="name" />
            ) : null}
        </Column>
    )
}
