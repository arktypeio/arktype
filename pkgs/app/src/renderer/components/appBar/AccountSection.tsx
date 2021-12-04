import React from "react"
import { Button, TogglableMenu, Icons, Modal } from "@re-do/components"
import {
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio
} from "@material-ui/core"
import { store } from "renderer/common"
import { BrowserName } from "@re-do/run"

export const Settings = () => {
    const defaultBrowser = store.useGet("defaultBrowser")
    return (
        <FormControl component="fieldset">
            <FormLabel component="legend">Default Browser</FormLabel>
            <RadioGroup
                aria-label="browser"
                name="browser"
                value={defaultBrowser}
                onChange={(e) =>
                    store.update({
                        defaultBrowser: e.target.value as BrowserName
                    })
                }
            >
                <FormControlLabel
                    value="chrome"
                    control={<Radio />}
                    label="Chrome"
                />
                <FormControlLabel
                    value="safari"
                    control={<Radio />}
                    label="Safari"
                />
                <FormControlLabel
                    value="firefox"
                    control={<Radio />}
                    label="Firefox"
                />
            </RadioGroup>
        </FormControl>
    )
}

export const AccountSection = ({}) => {
    const settingsToggle = (
        <Button Icon={Icons.settings} style={{ color: "white" }} />
    )
    return (
        <>
            <Modal toggle={settingsToggle} content={<Settings />} />
            {/* <TogglableMenu
                toggle={
                    <Button Icon={Icons.account} style={{ color: "white" }} />
                }
                options={{
                    Logout: () => store.update({ token: "" })
                }}
            /> */}
        </>
    )
}
