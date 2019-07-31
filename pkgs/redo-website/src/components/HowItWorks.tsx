import React, { FC } from "react"
import { Row, Text, Card, Column } from "redo-components"
import { makeStyles, useTheme } from "@material-ui/styles"
import { Theme, Grid } from "@material-ui/core"

const stylize = makeStyles((theme: Theme) => ({
    descriptionText: {
        lineHeight: 3.6
    }
}))

type StepProps = {
    label: string
    children: string
}

const Step: FC<StepProps> = ({ label, children }) => {
    const { descriptionText } = stylize()
    return (
        <Card width="100%">
            <Row align="baseline">
                <Text variant="h3" color="secondary">
                    {label}
                </Text>
                <Text className={descriptionText} variant="h5" color="primary">
                    {children}
                </Text>
            </Row>
        </Card>
    )
}

export const HowItWorks: FC = () => {
    return (
        <>
            <Step label="1.">Open the Redo desktop app</Step>
            <Step label="2.">Interact with your website</Step>
            <Step label="3.">Save your new automated test</Step>
        </>
    )
}
