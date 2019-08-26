import React, { FC } from "react"
import { Typography as MuiTypography } from "@material-ui/core"
import { Column, Card, Row, useTheme, Icons } from "redo-components"

export type SuggestionCardProps = {
    name: string
    kind: string
    description?: string
}

export const SuggestionCard: FC<SuggestionCardProps> = ({
    name,
    kind,
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
                {description ? (
                    <Row full={true} justify="center" align="center">
                        <MuiTypography variant="body2" align="center">
                            {description}
                        </MuiTypography>
                    </Row>
                ) : null}

                <Row full={true} justify="center" align="center">
                    {kind === "test" ? <Icons.run /> : null}
                    <Icons.view />
                </Row>
            </Column>
        </Card>
    )
}
