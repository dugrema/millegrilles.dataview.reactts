import {useCallback, useMemo} from "react";

type SwitchButtonProps = {
    value: boolean,
    onChange: (value: boolean)=>void,
    name?: string,
    idx?: number,
    className?: string,
};

function SwitchButton(props: SwitchButtonProps) {

    const {value, onChange, className} = props;
    const toggleSwitchHandler = useCallback(()=>{
        onChange(!value);
    }, [value, onChange])

    const effectiveClassname = useMemo(()=>{
        let effectiveClassname = "inline-flex items-center cursor-pointer";
        if(className) effectiveClassname += ' ' + className;
        return effectiveClassname;
    }, [className]);

    return (
        <label className={effectiveClassname}>
            <input type="checkbox" className="sr-only peer" checked={props.value} onChange={toggleSwitchHandler}
                   name={props.name} data-idx={''+props.idx} />
            <div
                className="
                    relative w-11 h-6 bg-gray-300
                    peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300
                    dark:peer-focus:ring-indigo-800
                    rounded-full
                    peer dark:bg-gray-700 peer-checked:after:translate-x-full
                    rtl:peer-checked:after:-translate-x-full
                    peer-checked:after:border-white after:content-['']
                    after:absolute after:top-[2px] after:start-[2px]
                    after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                    dark:border-gray-600 peer-checked:bg-indigo-600
                    disabled:bg-gray-600 peer-disabled:bg-slate-600">
            </div>
        </label>
    );
}

export default SwitchButton;
