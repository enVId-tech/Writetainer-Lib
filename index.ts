// For interfacing with the backend API
import { PortainerApiGetClient } from './portainer/api.ts';
import { PortainerFactory } from './portainer/factory.ts';

async function main() {
    const portainerGetClient = PortainerApiGetClient.getInstance(
        null
    );

    console.log('Portainer URL from environment:', process.env.PORTAINER_URL);
    console.log('Portainer API Token from environment:', process.env.PORTAINER_API_KEY ? '***' : 'Not Set');

    console.log('Environment ID from PortainerAuth:', await portainerGetClient.ensureEnvId());
    console.log('PortainerAuth isValidated:', await (portainerGetClient as any).auth.isValidated);
    console.log('Is Connected: ', await portainerGetClient.getStatus());
    // console.log(`Stacks: ${await portainerGetClient.getStacks()}`);


    console.log("Creating new stack:")

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
}

await main();