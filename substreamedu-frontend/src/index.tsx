import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {BrowserRouter} from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';

const rootElement = document.getElementById('root') as HTMLElement;


if (rootElement.hasChildNodes()) {
    ReactDOM.hydrateRoot(
        rootElement,
        <HelmetProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </HelmetProvider>
    );
} else {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <HelmetProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </HelmetProvider>
    );
}

reportWebVitals();