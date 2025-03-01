import {Link} from "react-router-dom";

function WelcomePage() {
    return (
        <div className="w-full text-center margin-auto p-10">
            <h1 className="text-indigo-300 text-4xl sm:text-5xl font-bold pb-20">Welcome to <div className="inline-block text-nowrap">data viewer</div></h1>
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-y-4">
                <Link to='public'
                      className='btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700' >
                    Public feeds
                </Link>
                <Link to='private'
                      className='btn text-center text-indigo-300 text-2xl active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700' >
                    Go private
                </Link>
            </section>
        </div>
    )
}

export default WelcomePage;
