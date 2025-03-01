import {useMemo} from "react";
import useWorkers from "./workers/workers.ts";
import {Link, useLocation} from "react-router-dom";

import HomeIcon from './assets/home-1-svgrepo-com.svg';
import SearchIcon from './assets/search-svgrepo-com.svg';
import SettingIcon from './assets/settings-svgrepo-com.svg';
import LogoutIcon from './assets/logout-svgrepo-com.svg';

const selectedClassname = ' bg-indigo-500';
const unselectedClassname = ' bg-indigo-900 bg-opacity-30';

function Menu() {

    const location = useLocation();
    const [, ready] = useWorkers();

    const cssDisconnected = useMemo(()=>{
        if(!ready) return ' bg-red-500';
        // if(!filehostAuthenticated) return ' bg-amber-700'
        return '';
    }, [ready]);

    const selectedSection = useMemo(()=>{
        const locationPath = location.pathname;
        if(locationPath.startsWith('/dataviewer/private/search')) {
            return 'search';
        }
        else if(locationPath.startsWith('/dataviewer/private/settings')) {
            return 'settings';
        }
        else if(locationPath.startsWith('/dataviewer/private')) {
            return 'feeds';
        }
        return null;
    }, [location]);

    return (
        <header className={'fixed pl-2 pr-6 pt-2 top-0 transition grid grid-cols-4 w-full' + cssDisconnected}>

            {/* Left portion of the menu: banner. Hide when <sm. */}
            <div className='hidden sm:inline text-lg font-bold underline'>
                <span>Data Viewer</span>
            </div>

            {/* Middle section of the menu. */}
            <div className='col-span-4 sm:col-span-2 text-center sm:text-center border-b border-indigo-500'>

                {/* Regular menu items - need to hide in mobile mode during selection. */}
                <div className={'inline'}>
                    <div className={'inline-block mx-0.5 px-1 sm:px-2 rounded-t-md transition-colors duration-300' + (selectedSection==='feeds'?selectedClassname:unselectedClassname)}>
                        <Link to='/dataviewer/private'>
                            <img src={HomeIcon} alt="Private feeds" className='w-7 inline-block' />
                        </Link>
                    </div>
                    <div className={'inline-block mx-0.5 px-1 sm:px-2 rounded-t-md  transition-colors duration-300' + (selectedSection==='search'?selectedClassname:unselectedClassname)}>
                        <Link to='/dataviewer/private/search'>
                            <img src={SearchIcon} alt="Search" className='w-7 inline-block' />
                        </Link>
                    </div>
                    <div className={'inline-block mx-0.5 px-1 sm:px-2 rounded-t-md  transition-colors duration-300' + (selectedSection==='settings'?selectedClassname:unselectedClassname)}>
                        <Link to='/dataviewer/private/settings'>
                            <img src={SettingIcon} alt="Settings" className='w-7 inline-block' />
                        </Link>
                    </div>
                </div>

            </div>

            {/* Right portion of the menu: back to portal link. Hide when < md. */}
            <div className='hidden sm:inline text-right'>
                <a href="/millegrilles">
                    <img src={LogoutIcon} alt='Go to portal' className='w-7 inline' title='Back to portal' />
                </a>
            </div>

        </header>
    )
}

export default Menu;
