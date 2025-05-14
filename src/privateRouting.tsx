import PrivateFeeds from "./PrivateFeeds.tsx";
import PrivateSearch from "./PrivateSearch.tsx";
import PrivateSettings from "./PrivateSettings.tsx";
import AddFeedPage from "./AddFeed.tsx";
import UpdateFeed from "./UpdateFeed.tsx";
import FeedPage from "./FeedPage.tsx";
import AddFeedView from "./AddFeedView.tsx";
import UpdateFeedView from "./UpdateFeedView.tsx";
import FeedViewPage from "./FeedViewPage.tsx";

function createPrivateReactBrowserChildren() {
    return [
        { path: "", element: <PrivateFeeds /> },
        { path: "search", element: <PrivateSearch /> },
        { path: "settings", element: <PrivateSettings /> },
        { path: "addFeed", element: <AddFeedPage /> },
        { path: "feed/:feedId", element: <FeedPage /> },
        { path: "feed/:feedId/update", element: <UpdateFeed /> },
        { path: "feed/:feedId/addView", element: <AddFeedView /> },
        { path: "feed/:feedId/:viewId", element: <FeedViewPage /> },
        { path: "feed/:feedId/:viewId/updateView", element: <UpdateFeedView /> },
    ];
}

export default createPrivateReactBrowserChildren;
