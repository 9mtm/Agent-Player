import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { createEntryClient } from './entry-client';
declare const __LIVE_ENTRY_CANDIDATE__: boolean;
const client = createEntryClient(typeof __LIVE_ENTRY_CANDIDATE__ !== 'undefined' && __LIVE_ENTRY_CANDIDATE__, window);
const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode>{client ? <App client={client}/> : <App/>}</StrictMode>);
