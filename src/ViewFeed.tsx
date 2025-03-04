import {Link, useParams} from "react-router-dom";
import {DataItemsListType, useGetData} from "./GetData.ts";
import {useEffect, useMemo} from "react";
import {Formatters} from "millegrilles.reactdeps.typescript";
import {multiencoding} from "millegrilles.cryptography";

function ViewFeed() {

    const {feedId} = useParams();

    const {data, error} = useGetData({feedId});

    useEffect(()=>{
        if(error) {
            console.error(error);
            return;
        }
        console.debug("Feed data", data);
    }, [data, error]);

    return (
        <>
            <section className='fixed top-10 md:top-12 left-0 right-0 px-2'>
                <h1 className="text-indigo-300 text-xl font-bold pb-2">Private feeds</h1>
                <Link to="/dataviewer/private"
                      className="btn inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700">
                    Back
                </Link>

                <Link to={`/dataviewer/private/feed/${feedId}/update`}
                      className="btn inline-block text-center text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Edit
                </Link>
            </section>

            <section className="w-full fixed top-32 bottom-10 px-2 overflow-y-auto">
                <ViewFeedGoogleTrendsNews value={data} />
            </section>
        </>
    )
}

export default ViewFeed;

type GoogleTrendsItem = {
    title: string,
    pub_date: number,
    thumbnail?: string | null,
    url?: string | null,
}

function ViewFeedGoogleTrendsNews(props: {value: DataItemsListType}) {
    const {value} = props

    const [dataElems, thumbnails] = useMemo(()=>{
        if(!value || value.items.length === 0) {
            return [[], null];
        }
        const elems = [];
        const thumbnails = [];

        for(const elem of value.items) {
            const gelem = elem.decrypted_data as GoogleTrendsItem;
            let thumbnail: string | null = null;
            if(gelem.thumbnail) {
                const thumbnailBlob = new Blob([multiencoding.decodeBase64Nopad(gelem.thumbnail)]);
                thumbnail = URL.createObjectURL(thumbnailBlob);
                thumbnails.push(thumbnail);  // Keep for cleanup
            }
            elems.push(
                <div className="grid grid-cols-6 space-x-4">
                    {thumbnail?
                        <img className="object-cover pr-2" src={thumbnail} alt="Thumbnail" />
                    :
                        <div></div>
                    }

                    {gelem.url?
                        <a href={gelem.url} target='_blank' className="col-span-4">{gelem.title}</a>
                    :
                        <p>{gelem.title}</p>
                    }

                    <Formatters.FormatterDate value={gelem.pub_date} />
                </div>
            );
        }

        return [elems, thumbnails];
    }, [value]);

    useEffect(()=>{
        if(!thumbnails) return;
        // Cleanup thumbnail blobs
        return () => {
            thumbnails?.forEach(thumb => {
                URL.revokeObjectURL(thumb);
            })
        }
    }, [thumbnails])

    return (
        <div className='space-y-4'>
            {dataElems}
        </div>
    )
}
