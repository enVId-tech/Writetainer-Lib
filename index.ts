// For interfacing with the backend API
import { PortainerApi } from './src/api.ts';
import { PortainerFactory } from './src/factory.ts';
import { logInfo, logWarn, logError } from './logger.ts';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function main() {
    const portainerGetClient = PortainerApi.getInstance(
        null
    );

    logInfo('Portainer URL from environment:', process.env.PORTAINER_URL);
    logInfo('Portainer API Token from environment:', process.env.PORTAINER_API_KEY ? '***' : 'Not Set');

    logInfo('Environment ID from PortainerAuth:', await portainerGetClient.ensureEnvId());
    logInfo('PortainerAuth isValidated:', await (portainerGetClient as any).auth.isValidated);
    logInfo('Is Connected: ', await portainerGetClient.getStatus());
    // logInfo(`Stacks: ${await portainerGetClient.getStacks()}`);


    logInfo("Creating new stack:")

    const stackContent = `services:
  test2-minecraftserver:
    image: itzg/minecraft-server
    container_name: test2-minecraftserver
    volumes:
      - /mnt/nvme/minecraft/test2-minecraftserver:/data
    environment:
      TYPE: PURPUR
      VERSION: 1.21.11
      EULA: "TRUE"
      INIT_MEMORY: 1G
      MAX_MEMORY: 2G
      SERVER_PORT: 25579
      ENABLE_WHITELIST: false
      ENFORCE_WHITELIST: false
      ONLINE_MODE: false
      PORT: 25579
      EXISTING_WHITELIST_FILE: SYNC_FILE_MERGE_LIST
    restart: unless-stopped
    tty: true
    stdin_open: true
    `

    await PortainerFactory.getInstance().createStack({
        Name: "test2-minecraftserver".toLowerCase(),
        ComposeFile: stackContent,
        Env: []
    })

    await PortainerApi.instance.deleteStack("test2-minecraftserver".toLowerCase());
}

await main();