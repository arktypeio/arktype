import React from "react"
import { Text, Column } from "@re-do/components"
import { steps } from "content"
import { Steps } from "./Steps.js"
import redoDemoMp4 from "assets/RedoDemo.mp4"

export const HowItWorks = () => {
    const maxWidth = window.innerWidth >= 528 ? 480 : 0.9 * window.innerWidth
    return (
        <Column align="center" style={{ paddingTop: 48, maxWidth }}>
            <Text variant="h2" style={{ fontWeight: 700 }}>
                How it works
            </Text>
            <div style={{ maxWidth }}>
                <Steps>{steps}</Steps>
            </div>
            <video style={{ maxWidth }} src={redoDemoMp4} controls />
        </Column>
    )
}
