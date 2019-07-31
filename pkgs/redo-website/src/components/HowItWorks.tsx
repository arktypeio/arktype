import React, { FC } from "react"
import { Column } from "redo-components"
import { AnimatedCheckbox } from "./AnimatedCheckbox"

export const HowItWorks: FC = () => {
    return (
        <Column align="flex-start">
            <AnimatedCheckbox />
            <AnimatedCheckbox />
            <AnimatedCheckbox />
        </Column>
    )
}
