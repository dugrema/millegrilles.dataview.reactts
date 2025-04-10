import PrivateFeeds from "./PrivateFeeds.tsx";
import PrivateSearch from "./PrivateSearch.tsx";
import PrivateSettings from "./PrivateSettings.tsx";
import AddFeedPage from "./AddFeed.tsx";
import UpdateFeed from "./UpdateFeed.tsx";
import ViewFeed from "./ViewFeed.tsx";

function createPrivateReactBrowserChildren() {
    return [
        { path: "", element: <PrivateFeeds /> },
        { path: "search", element: <PrivateSearch /> },
        { path: "settings", element: <PrivateSettings /> },
        { path: "addFeed", element: <AddFeedPage /> },
        { path: "feed/:feedId", element: <ViewFeed /> },
        { path: "feed/:feedId/update", element: <UpdateFeed /> },
    ];
}

export default createPrivateReactBrowserChildren;
