import React, { FC } from "react"
import { Row, Text } from "redo-components"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { AnimatedCheckbox } from "./AnimatedCheckbox"

const stylize = makeStyles((theme: Theme) => ({
    stepText: {
        width: 331
    }
}))

type StepProps = {
    children: string
}

const Step: FC<StepProps> = ({ children }) => {
    const { stepText } = stylize()
    return (
        <Row align="center">
            <AnimatedCheckbox />
            <Text className={stepText} variant="h5">
                {children}
            </Text>
        </Row>
    )
}

export const HowItWorks: FC = () => {
    return (
        <>
            <Step>Open the Redo desktop app</Step>
            <Step>Interact with your website</Step>
            <Step>Save your new automated test</Step>
        </>
    )
}
