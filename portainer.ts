import axios from 'axios';
import https from 'https';
import { config } from 'dotenv';

if (!process.env.PORTAINER_URL) {
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    console.log = () => {};
    console.info = () => {};
    
    config({ path: '.env', debug: false });
    
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
}
