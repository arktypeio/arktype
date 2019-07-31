import finder from "@medv/finder"
import { BrowserEventInput } from "renderer/common"

export const watchPage = async () => {
    const browserWindow: Window & {
        notify: (e: BrowserEventInput) => void
    } = window as any
    const events = {
        CLICK: "click",
        DBLCLICK: "dblclick",
        CHANGE: "change",
        SELECT: "select",
        SUBMIT: "submit"
    }
    Object.values(events).forEach(event =>
        browserWindow.addEventListener(
            event,
            async (e: Event) => {
                const browserEvent: BrowserEventInput = {
                    type: e.type,
                    selector: "",
                    value: ""
                }
                if (e.target) {
                    const target = e.target as HTMLElement
                    browserEvent.selector = finder(target as HTMLElement)
                    switch (e.type) {
                        case "change":
                            if (e.target) {
                                const inputTarget = target as HTMLInputElement
                                browserEvent.value = inputTarget.value
                            }
                    }
                }
                browserWindow.notify(browserEvent)
            },
            true
        )
    )
}

watchPage()
