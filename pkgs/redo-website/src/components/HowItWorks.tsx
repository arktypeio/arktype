import React, { FC } from "react"
import { Row, Text, Column } from "redo-components"

import { AnimatedCheckbox } from "./AnimatedCheckbox"

type StepProps = {
    children: string
}

const Step: FC<StepProps> = ({ children }) => {
    return (
        <Row align="center">
            <AnimatedCheckbox />
            <Text variant="h5">{children}</Text>
        </Row>
    )
}

export const HowItWorks: FC = () => {
    return (
        <div>
            <Step>Open the Redo desktop app</Step>
            <Step>Interact with your website</Step>
            <Step>Save your new automated test</Step>
        </div>
    )
}
