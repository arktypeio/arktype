import React, { FC } from "react"
import { Typography as MuiTypography } from "@material-ui/core"
import { PlayButton, ViewButton } from "custom"
import { Column, Card, Row, useTheme } from "redo-components"

export type SuggestionCardProps = {
    name: string
    type: string
    description?: string
}

export const SuggestionCard: FC<SuggestionCardProps> = ({
    name,
    type,
    description
}) => {
    const theme = useTheme()
    return (
        <div
            style={{
                height: theme.spacing(20),
                width: theme.spacing(20)
            }}
        >
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
