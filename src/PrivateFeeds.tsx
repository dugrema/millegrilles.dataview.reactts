import {Link} from "react-router-dom";

function PrivateFeeds() {
    return (
        <div className='fixed top-10 md:top-12 left-0 right-0 px-2 bottom-10 overflow-y-auto'>
            <h1 className="text-indigo-300 text-4xl sm:text-5xl font-bold pb-20">Private feeds</h1>
            <Link to="/dataviewer"
                  className="btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </div>
    );
}

export default PrivateFeeds;
