import {StrictMode, Suspense} from 'react'
import { createRoot } from 'react-dom/client'
import {ErrorBoundary} from "react-error-boundary";

import './index.css'

import App from './App.tsx'
import Loading from "./Loading.tsx";
import {ErrorPage} from "./Error.tsx";

import {certificates} from "millegrilles.cryptography";
// import {install as solanaInstall} from '@solana/webcrypto-ed25519-polyfill';
// console.log("SolanaInstall()", solanaInstall);
// solanaInstall();

// async function test() {
//     const ficheResponse = await fetch('/fiche.json');
//     if(ficheResponse.status !== 200) {
//         throw new Error(`Loading fiche.json, invalid response (${ficheResponse.status})`)
//     }
//     const fiche = await ficheResponse.json();
//     const ca = fiche.millegrille;
//
//     const store = new certificates.CertificateStore(ca);
//     let result: certificates.CertificateWrapper | boolean = false;
//     try {
//         result = await store.verifyMessage(fiche);
//     } catch (error) {
//         console.error("error verifying message", error);
//         throw error;
//     }
//     console.debug("Result", result);
//
//     // console.debug("Crypto subtle verify available?", !!crypto.subtle.verify)
//     //
//     // const keyPair = await crypto.subtle.generateKey('Ed25519', false, ['sign']);
//     // const publicKeyBytes = await crypto.subtle.exportKey('raw', keyPair.publicKey);
//     // console.log("Public key", publicKeyBytes);
//     // const data = new Uint8Array([1, 2, 3]);
//     // const signature = await crypto.subtle.sign('Ed25519', keyPair.privateKey, data);
//     // console.log("Signature", signature);
//     // try {
//     //     let importedPublicKey = await crypto.subtle.importKey("raw", publicKeyBytes, "Ed25519", true, ['verify']);
//     //     if (await crypto.subtle.verify('Ed25519', importedPublicKey, signature, data)) {
//     //         console.log('Data was signed using the private key associated with this public key');
//     //     } else {
//     //         console.error('Signature verification error');
//     //     }
//     // } catch (error) {
//     //     console.error("Verify error", error);
//     // }
// }
//
// test().catch((error: Error) => {console.error(error.message)});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Suspense fallback={<Loading />}>
            <ErrorBoundary fallback={<ErrorPage />}>
                <App />
            </ErrorBoundary>
        </Suspense>
    </StrictMode>,
)
