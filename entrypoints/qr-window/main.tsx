import React from 'react';
import ReactDOM from 'react-dom/client';
import QRWindow from './QRWindow';
import '../../assets/tailwind.css';

console.log('QR Window main.tsx loading...');

const appElement = document.getElementById('app');
if (!appElement) {
    console.error('App element not found!');
} else {
    console.log('App element found, mounting React...');
    const root = ReactDOM.createRoot(appElement);
    root.render(
        <React.StrictMode>
            <QRWindow />
        </React.StrictMode>
    );
    console.log('React mounted successfully');
}
