import {MouseEvent, ReactNode, useCallback, useEffect, useMemo, useState} from "react";
import { IconCheckSvg, IconCompactDiscSvg, IconXSvg } from "./Icons";
import QuestionIcon from './assets/question-circle-svgrepo-com.svg';

type ActionButtonProps = {
    onClick: (e: MouseEvent<HTMLButtonElement>)=>Promise<void>,
    disabled?: boolean | null,
    mainButton?: boolean,
    forceErrorStatus?: boolean,
    children: ReactNode,
    name?: string | undefined,
    value?: string | undefined,
    revertSuccessTimeout?: number | undefined,  // Seconds to revert back if success
    confirm?: boolean,
    varwidth?: number,
    className?: string | null,  // Override of the base 'btn' and 'varbtn' settings from index.css
};

function ActionButton(props: ActionButtonProps) {

    const { onClick, disabled, mainButton, forceErrorStatus, name, value, revertSuccessTimeout, confirm, varwidth, className } = props;

    const [success, setSuccess] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState('');
    const [confirming, setConfirming] = useState(false);

    const [buttonClassName, Icon] = useMemo(()=>{
        let btnClass = 'btn ';
        if(className) {
            // Override
            btnClass = className + ' ';
        } else if(varwidth) {
            btnClass = 'varbtn w-' + varwidth;
        }

        if(error || forceErrorStatus) return [
            `${btnClass} inline-block text-center bg-red-700 hover:bg-red-600 active:bg-red-500 disabled:bg-red-800`,
            <IconXSvg className='w-6 fill-white inline'/>
        ];
        if(confirming) {
            return [
                `${btnClass} inline-block text-center bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-400 disabled:bg-yellow-700`,
                <img src={QuestionIcon} alt='Confirm action' className='w-6 inline'/>
            ]
        }
        if(success) return [
            `${btnClass} inline-block text-center bg-green-700 hover:bg-green-600 active:bg-green-500 disabled:bg-green-800`,
            <IconCheckSvg className='w-6 fill-green-500 inline'/>
        ];
        if(mainButton) return [
            `${btnClass} inline-block text-center text-slate-300 text bg-indigo-600 active:text-slate-800 hover:bg-indigo-800 active:bg-indigo-700`,
            waiting?<IconCompactDiscSvg className='w-6 fill-slate-500 inline animate-spin' />:null
        ];
        return [
            `${btnClass} inline-block text-center bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:bg-slate-800`,
            waiting?<IconCompactDiscSvg className='w-6 fill-slate-500 inline animate-spin' />:null
        ];
    }, [error, forceErrorStatus, confirming, success, mainButton, waiting, varwidth, className]);

    const clickHandler = useCallback((e: MouseEvent<HTMLButtonElement>)=>{
        // Reset
        e.stopPropagation();
        e.preventDefault();

        setSuccess(false);
        setError('');

        if(confirm && !confirming) {
            setConfirming(true);
            return;
        }
        setConfirming(false);

        setWaiting(true);
        onClick(e)
            .then(()=>{
                setSuccess(true);
                setError('');
            })
            .catch(err=>{
                console.error("ActionButton Error", err);
                setError(''+err);
                setSuccess(false);
            })
            .finally(()=>{
                setWaiting(false);
            });

    }, [setSuccess, setWaiting, setError, onClick, confirm, confirming, setConfirming]);

    useEffect(()=>{
        if(!revertSuccessTimeout) return;
        if(success) {
            const timeout = setTimeout(()=>setSuccess(false), revertSuccessTimeout * 1_000);
            return () => {
                clearTimeout(timeout);
            }
        }
    }, [revertSuccessTimeout, success]);

    useEffect(()=>{
        if(!confirm) return;
        if(!confirming) return;
        const timeout = setTimeout(()=>setConfirming(false), 2_000);
        return () => {
            clearTimeout(timeout);
        }
    }, [confirm, confirming, setConfirming]);

    return (
        <button onClick={clickHandler} disabled={!!disabled || waiting} name={name} value={value}
                className={buttonClassName}>
            {Icon?Icon:props.children}
        </button>
    )
}

export default ActionButton;
