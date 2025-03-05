import {StrictMode, Suspense} from 'react'
import { createRoot } from 'react-dom/client'
import {ErrorBoundary} from "react-error-boundary";

import './index.css';

import App from './App.tsx';
import Loading from "./Loading.tsx";
import {ErrorPage} from "./Error.tsx";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Suspense fallback={<Loading />}>
            <ErrorBoundary fallback={<ErrorPage />}>
                <App />
            </ErrorBoundary>
        </Suspense>
    </StrictMode>,
)
