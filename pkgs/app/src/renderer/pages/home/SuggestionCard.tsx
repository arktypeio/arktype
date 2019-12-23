import React from "react"
import { Column, Card, Row, Text, Icons, IconButton } from "@re-do/components"
import { ValueFrom } from "@re-do/utils"
import { Test } from "@re-do/model"

type SuggestionKinds = {
    test: {
        name: string
        description: string
    }
    other: {
        name: string
        description: string
    }
}

type SuggestionKind = keyof SuggestionKinds

export type SuggestionCardProps<T extends SuggestionKind> = {
    kind: T
    value: ValueFrom<SuggestionKinds, T>
}

export const getSuggestionExtras = (): SuggestionExtras => {
    return {
        test: [],
        other: []
    }
}

type SuggestionExtras = { [K in SuggestionKind]: JSX.Element[] }

export const SuggestionCard = <T extends SuggestionKind>({
    kind,
    value: { name, description }
}: SuggestionCardProps<T>) => {
    const extras = getSuggestionExtras()
    return (
        <Card
            style={{
                height: 160,
                width: 160
            }}
        >
            <Column full={true} justify="space-around">
                <Row full={true} justify="center" align="center">
                    <Text variant="h6" noWrap align="center">
                        {name}
                    </Text>
                </Row>
                <Row full={true} justify="center" align="center">
                    <Text variant="body2" align="center">
                        {description}
                    </Text>
                </Row>
                <Row full={true} justify="center" align="center">
                    {kind === "test" ? (
                        <IconButton Icon={Icons.run} onClick={() => {}} />
                    ) : null}
                </Row>
            </Column>
        </Card>
    )
}
