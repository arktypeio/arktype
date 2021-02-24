import React from "react"
import { ipcRenderer } from "electron"
import { Button, Icons } from "@re-do/components"

export type NewTestButtonProps = {}

export const NewTestButton = () => {
    return (
        <>
            <Button
                Icon={Icons.add}
                style={{ color: "white" }}
                onClick={() => {
                    ipcRenderer.sendSync("builder", "open")
                }}
            />
            <Button
                Icon={Icons.add}
                style={{ color: "white" }}
                onClick={() => {
                    ipcRenderer.sendSync("builder", "open")
                }}
            />
        </>
    )
}
