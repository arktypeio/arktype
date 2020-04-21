import React from "react"
import { Column, Text, Icons } from "@re-do/components"
import { layout } from "../constants"

export const TwitchInfo = () => (
    <Column align="center" width={layout.signUpWidth}>
        <a href="https://bit.ly/on-twitch" target="_blank">
            <Text variant="h4" color="primary">
                <Icons.twitch color="primary" style={{ fontSize: 58 }} />
                Watch live!
                <Icons.twitch color="primary" style={{ fontSize: 58 }} />
            </Text>
        </a>
        <Text align="center">
            We're building Redo live on Twitch! Drop in to watch, say hi, or ask
            us anything! A lot of us could stand to feel a little less alone
            right now 💓
        </Text>
    </Column>
)
