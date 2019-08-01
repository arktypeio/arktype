import React from "react"
import { Theme, Typography as MuiTypography } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { PlayButton, ViewButton } from "custom"
import { Column, Card, Row } from "redo-components"

const stylize = makeStyles((theme: Theme) => ({
    suggestionCard: {
        height: theme.spacing(20),
        width: theme.spacing(20)
    }
}))

export type SuggestionCardProps = {
    name: string
    type: string
    description?: string
}

export const SuggestionCard = ({
    name,
    type,
    description
}: SuggestionCardProps) => {
    const { suggestionCard } = stylize()
    return (
        <div className={suggestionCard}>
            <Card>
                <Column>
                    <Row justify="center">
                        <MuiTypography variant="h6" noWrap>
                            {name}
                        </MuiTypography>
                    </Row>
                    <Row justify="center">
                        <MuiTypography variant="body2">
                            {description
                                ? description
                                : "This is a description"}
                        </MuiTypography>
                    </Row>
                    <Row justify="space-around">
                        {type === "test" ? <PlayButton /> : null}
                        <ViewButton />
                    </Row>
                </Column>
            </Card>
        </div>
    )
}
