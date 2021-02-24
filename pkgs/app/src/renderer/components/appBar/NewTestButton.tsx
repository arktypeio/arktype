import React from "react"
import { Button, Icons } from "@re-do/components"

export type NewTestButtonProps = {}

export const NewTestButton = () => {
    return (
        <Button
            Icon={Icons.add}
            style={{ color: "white" }}
            onClick={() => {
                window.open(`${window.location.href}builder`)
            }}
        />
    )
}
