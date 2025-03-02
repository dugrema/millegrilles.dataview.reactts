import {Link} from "react-router-dom";

function PrivateFeeds() {
    return (
        <div className='fixed top-10 md:top-12 left-0 right-0 px-2 bottom-10 overflow-y-auto'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">Private feeds</h1>
            <Link to="/dataviewer"
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>

            <Link to="/dataviewer/private/addFeed"
                  className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                Add feed
            </Link>
        </div>
    );
}

export default PrivateFeeds;
