import PrivateFeeds from "./PrivateFeeds.tsx";
import PrivateSearch from "./PrivateSearch.tsx";
import PrivateSettings from "./PrivateSettings.tsx";
import AddFeedPage from "./AddFeed.tsx";

function createPrivateReactBrowserChildren() {
    return [
        { path: "", element: <PrivateFeeds /> },
        { path: "search", element: <PrivateSearch /> },
        { path: "settings", element: <PrivateSettings /> },
        { path: "addFeed", element: <AddFeedPage /> },
    ];
}

export default createPrivateReactBrowserChildren;
