// For interfacing with the backend API
import dotenv from 'dotenv';
import { PortainerApiClient } from './portainer/portainer.ts';

if (!process.env.PORTAINER_URL) {
    // Suppress console output during dotenv configuration
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    console.log = () => { };
    console.info = () => { };

    dotenv.config({ path: '.env', debug: false });

    // Restore original console functions
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
}

async function main() {
    console.log('Portainer URL from environment:', process.env.PORTAINER_URL);
    console.log('Portainer API Token from environment:', process.env.PORTAINER_API_TOKEN ? '***' : 'Not Set');

    const portainerClient = new PortainerApiClient(
        process.env.PORTAINER_URL || 'http://localhost:9000',
        process.env.PORTAINER_API_TOKEN || ''
    )

    console.log('Environment ID from PortainerAuth:', portainerClient.DefaultEnvironmentId);
    console.log('PortainerAuth isValidated:', (portainerClient as any).isValidated);
    console.log('Is Connected: ', await portainerClient.testConnection());
    console.log(`Stacks: ${portainerClient.getStacks()}`);
}

await main();