import {Dispatch, useCallback, useMemo, MouseEvent} from "react";

export function PageSelectors(props: {page: number, pageCount: number, setPage: Dispatch<number>}) {

    const {page, setPage, pageCount} = props;

    const onClick = useCallback((e: MouseEvent<HTMLButtonElement>)=>{
        const pageNo = Number.parseInt(e.currentTarget.value);
        setPage(pageNo);
    }, [setPage]);

    const pageElems = useMemo(()=>{
        const pageElems = [] as React.ReactNode[];
        for(let p=1; p<=pageCount; p++) {

            let className: string
            if(p === page) {
                className = 'varbtn w-8 inline-block text-center bg-indigo-800 hover:bg-indigo-600 active:bg-indigo-500 disabled:bg-indigo-900';
            } else {
                className='varbtn w-8 inline-block text-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:bg-slate-800';
            }

            pageElems.push(
                <button key={`page-${p}`} onClick={onClick} value={''+p} className={className}>{p}</button>
            );
        }
        return pageElems;
    }, [page, pageCount, onClick]);

    if(pageCount <= 1) return <></>;

    return (
        <div className='w-full text-center'>
            {pageElems}
        </div>
    )
}
