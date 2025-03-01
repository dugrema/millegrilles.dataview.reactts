import {Link} from "react-router-dom";

function WelcomePage() {
    return (
        <>
            <h1 className="text-3xl font-bold underline pb-4">Welcome to data viewer</h1>
            <Link to='private'
                  className='btn text-center text-indigo-300 active:text-slate-800 bg-indigo-800 hover:bg-indigo-600 active:bg-indigo-500 disabled:bg-indigo-900' >
                Go private
            </Link>
        </>
    )
}

export default WelcomePage;
