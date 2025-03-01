import PrivateFeeds from "./PrivateFeeds.tsx";
import PrivateSearch from "./PrivateSearch.tsx";
import PrivateSettings from "./PrivateSettings.tsx";

function createPrivateReactBrowserChildren() {
    return [
        { path: "", element: <PrivateFeeds /> },
        { path: "search", element: <PrivateSearch /> },
        { path: "settings", element: <PrivateSettings /> },
    ];
}

export default createPrivateReactBrowserChildren;
