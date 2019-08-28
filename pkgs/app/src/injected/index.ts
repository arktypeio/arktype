import finder from "@medv/finder"
import { StepInput } from "@re-do/model"

export const watchPage = async () => {
    const browserWindow: Window & {
        notify: (e: StepInput) => void
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
                const step: StepInput = {
                    key: e.type,
                    selector: "",
                    value: ""
                }
                if (e.target) {
                    const target = e.target as HTMLElement
                    step.selector = finder(target as HTMLElement)
                    switch (e.type) {
                        case "change":
                            if (e.target) {
                                const inputTarget = target as HTMLInputElement
                                step.value = inputTarget.value
                            }
                    }
                }
                browserWindow.notify(step)
            },
            true
        )
    )
}

watchPage()
