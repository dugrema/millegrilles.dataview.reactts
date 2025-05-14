import {Link, useParams} from "react-router-dom";
import {useGetData} from "./GetData.ts";
import {useMemo} from "react";


function FeedViewPage() {
    const {feedId} = useParams();
    // const {userId, ready, workers} = useWorkers();

    const {data, error} = useGetData({feedId, skip: 0, limit: 0, start_date: null, end_date: null});

    const feedName = useMemo(()=>{
        const name = data?.feed?.info?.name;
        if(!name) return 'Private Feed';
        return name;
    }, [data])

    if(error) return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: **view name**</h1>
            <p>Error loading information</p>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    );

    return (
        <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
            <h1 className="text-indigo-300 text-xl font-bold pb-2">{feedName}: **view name**</h1>
            <Link to={`/dataviewer/private/feed/${feedId}`}
                  className="btn inline-block text-center text-indigo-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                Back
            </Link>
        </section>
    )
}

export default FeedViewPage;
