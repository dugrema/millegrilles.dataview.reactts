import {lazy} from "react";
import {ErrorPage} from "./Error.tsx";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

import './App.css'
import WelcomePage from "./WelcomePage.tsx";

const DataViewerPrivate = lazy(()=>import('./DataViewerPrivate'));

const router = createBrowserRouter([
    {
        path: "/dataviewer",
        element: <WelcomePage />,
        errorElement: <ErrorPage />
    },{
        path: "/dataviewer/private",
        element: <DataViewerPrivate />,
        errorElement: <ErrorPage />
    }
]);

function App() {

  return (
    <>
        <div className="App-background text-slate-300">
            <RouterProvider router={router} />
        </div>
    </>
  )

}

export default App
