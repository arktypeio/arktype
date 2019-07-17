import React from "react"
import { Theme, Typography } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { component } from "blocks"
import { PlayButton, ViewButton } from "custom"
import { Column, Card, Row } from "blocks"

const styles = (theme: Theme) =>
    createStyles({
        suggestionCard: {
            height: theme.spacing(20),
            width: theme.spacing(20)
        }
    })

export type SuggestionCardProps = {
    name: string
    type: string
    description?: string
}

export const SuggestionCard = component({
    name: "SuggestionCard",
    defaultProps: {} as Partial<SuggestionCardProps>,
    styles
})(({ name, type, description, classes }) => (
    <div className={classes.suggestionCard}>
        <Card>
            <Column>
                <Row justify="center">
                    <Typography variant="h6" noWrap>
                        {name}
                    </Typography>
                </Row>
                <Row justify="center">
                    <Typography variant="body2">
                        {description ? description : "This is a description"}
                    </Typography>
                </Row>
                <Row justify="space-around">
                    {type === "test" ? <PlayButton /> : null}
                    <ViewButton />
                </Row>
            </Column>
        </Card>
    </div>
))
