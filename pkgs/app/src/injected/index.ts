import finder from "@medv/finder"
import { StepCreateWithoutUserCreateOnlyInput as StepInput } from "@re-do/model"

const eventTypes = {
    click: "click",
    dblclick: "click",
    submit: "click",
    change: "set",
    select: "set"
}

export const watchPage = async () => {
    const browserWindow: Window & {
        notify: (e: StepInput) => void
    } = window as any
    Object.keys(eventTypes).forEach(event =>
        browserWindow.addEventListener(
            event,
            async (e: Event) => {
                const step: StepInput = {
                    action: eventTypes[e.type as keyof typeof eventTypes],
                    selector: {
                        css: ""
                    },
                    value: ""
                }
                if (e.target) {
                    const target = e.target as HTMLElement
                    step.selector = { css: finder(target as HTMLElement) }
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
