import {useCallback, useEffect} from "react";
import {Moment} from "moment/moment";
import Datetime from "react-datetime";

type DateSelectorProps = {
    startDate: Date | null,
    endDate: Date | null,
    setStartDate: (date: Date | null)=>void,
    setEndDate: (date: Date | null)=>void
}

const DATETIME_DATE_FORMAT = 'YYYY-MM-DD';
const DATETIME_TIME_FORMAT = 'HH:mm:ss';

function DateSelectors(props: DateSelectorProps) {
    const {startDate, endDate, setStartDate, setEndDate} = props;

    const clearDates = useCallback(() => {
        console.debug("Clear dates")
        setStartDate(null);
        setEndDate(null);
    }, [setStartDate, setEndDate]);

    const onChangeStartDate = useCallback((date: string | Moment) => {
        let innerDate: Date;
        if(typeof date === 'string') {
            innerDate = new Date(date);
        } else {
            innerDate = date.toDate();
        }
        setStartDate(innerDate);
    }, [setStartDate]);

    const onChangeEndDate = useCallback((date: string | Moment) => {
        let innerDate: Date;
        if(typeof date === 'string') {
            innerDate = new Date(date);
        } else {
            innerDate = date.toDate();
        }
        setEndDate(innerDate);
    }, [setEndDate]);

    useEffect(()=>{

    }, [])

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3">
            <div className="bg-indigo-800">
                <span className="pr-2">Start</span>
                <Datetime
                    value={startDate || undefined}
                    onChange={onChangeStartDate}
                    dateFormat={DATETIME_DATE_FORMAT}
                    timeFormat={DATETIME_TIME_FORMAT}
                    closeOnSelect={true}
                    className="inline-block"
                />
            </div>
            <div className="bg-indigo-800">
                <span className="pr-2">End</span>
                <Datetime
                    value={endDate || undefined}
                    onChange={onChangeEndDate}
                    dateFormat={DATETIME_DATE_FORMAT}
                    timeFormat={DATETIME_TIME_FORMAT}
                    closeOnSelect={true}
                    className="inline-block"
                />
            </div>
            <div>
                <button onClick={clearDates}
                        className="btn text-slate-300 active:text-slate-800 bg-slate-600 hover:bg-indigo-800 active:bg-indigo-700">
                    Clear
                </button>
            </div>
        </div>
    )
}

export default DateSelectors;
