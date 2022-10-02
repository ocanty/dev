import * as B from "@blueprintjs/core"
import React from "react"
import { WithSidebar } from "../../common/WithSidebar"

export function Index(): React.ReactElement {
    return <WithSidebar sidebar={
        <>
            <B.MenuItem icon="new-text-box" text="New text box" />
            <B.MenuItem icon="new-object" text="New object" />
            <B.MenuItem icon="new-link" text="New link" />
            <B.MenuDivider />
            <B.MenuItem text="Settings..." icon="cog" intent="primary">
                <B.MenuItem icon="tick" text="Save on edit" />
                <B.MenuItem icon="blank" text="Compile on edit" />
            </B.MenuItem>
        </>
    }>
    </WithSidebar>
}