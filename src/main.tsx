import React from 'react';
import {createRoot} from 'react-dom/client';
import Kitchen from './kitchen';
import './globals.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Kitchen/></React.StrictMode>);
