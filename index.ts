// For interfacing with the backend API
import { PortainerApiGetClient } from './portainer/api.ts';

async function main() {
    const portainerGetClient = PortainerApiGetClient.getInstance(
        process.env.PORTAINER_URL || '',
        process.env.PORTAINER_API_KEY || '',
        null
    );
    
    console.log('Portainer URL from environment:', process.env.PORTAINER_URL);
    console.log('Portainer API Token from environment:', process.env.PORTAINER_API_KEY ? '***' : 'Not Set');

    console.log('Environment ID from PortainerAuth:', await portainerGetClient.envId);
    console.log('PortainerAuth isValidated:', await (portainerGetClient as any).auth.isValidated);
    console.log('Is Connected: ', await portainerGetClient.getStatus());
    // console.log(`Stacks: ${await portainerGetClient.getStacks()}`);
}

await main();