import React from "react"
import { FloatBar, FloatBarProps } from "."
import { Icons } from "../icons"
import { TextInput } from "../inputs"
import { Text } from "../text"
import { Button } from "../buttons"

export default {
    title: "FloatBar"
}

export const TopBar = (props: FloatBarProps) => (
    <div>
        <AppBar />
        {content}
    </div>
)

export const BottomBar = (props: FloatBarProps) => (
    <div>
        {content}
        <ActionBar />
    </div>
)

export const BarSandwich = (props: FloatBarProps) => (
    <div>
        <AppBar />
        {content}
        <ActionBar />
    </div>
)

const content = (
    <div>
        {[...Array(50)].map((_, index) => (
            <p>Line {index + 1} of 50</p>
        ))}
    </div>
)

const AppBar = () => (
    <FloatBar>
        <Text>Admiral AppBar</Text>
        <TextInput kind="underlined" colorTemplate="light" />
        <Button Icon={Icons.account} color="white" />
    </FloatBar>
)

const ActionBar = () => (
    <FloatBar kind="bottom">
        <Button Icon={Icons.back} color="white" />
        <Button Icon={Icons.save} color="white" />
    </FloatBar>
)
