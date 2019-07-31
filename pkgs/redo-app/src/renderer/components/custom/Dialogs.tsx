import React from "react"
import { component } from "blocks"
import { Dialog, Row } from "redo-components"
import { ChromeButton, FirefoxButton } from "custom"

// TODO: Reuse this component for launching browsers
export const ChooseBrowserDialog = component({
    name: "ChooseBrowserDialog",
    //query: { dialog: null },
    store: true
})(({ store /*data*/ }) => {
    const data = {
        dialog: null
    }
    return (
        <Dialog
            title="Choose a browser"
            open={data.dialog === "CHOOSE_BROWSER"}
            onClose={() =>
                store.mutate({
                    /*dialog: null*/
                })
            }
        >
            <Row justify="space-around">
                <ChromeButton />
                <FirefoxButton />
            </Row>
        </Dialog>
    )
})
