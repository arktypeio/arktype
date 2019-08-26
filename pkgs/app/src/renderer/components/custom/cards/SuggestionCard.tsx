import React, { FC } from "react"
import { Typography as MuiTypography } from "@material-ui/core"
import { Column, Card, Row, useTheme, Icons } from "@re-do/components"

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
        <Card
            style={{
                height: theme.spacing(20),
                width: theme.spacing(20)
            }}
        >
            <Column full={true} justify="space-around">
                <Row full={true} justify="center" align="center">
                    <MuiTypography variant="h6" noWrap align="center">
                        {name}
                    </MuiTypography>
                </Row>
                <Row full={true} justify="center" align="center">
                    <MuiTypography variant="body2" align="center">
                        {description ? description : "This is a description"}
                    </MuiTypography>
                </Row>
                <Row full={true} justify="center" align="center">
                    {type === "test" ? <Icons.run /> : null}
                    <Icons.view />
                </Row>
            </Column>
        </Card>
    )
}
