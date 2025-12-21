import { portainerGetClient } from "./api.ts";
import type { PortainerContainer } from "./interfaces.ts";

export async function getFirstEnvironmentId(): Promise<number | null> {
    try {
        const environments = await portainerGetClient.getEnvironments();
        return environments.length > 0 ? environments[0].Id : null;
    } catch (error) {
        console.error('Error getting first environment ID:', error);
        return Promise.resolve(null);
    }
}

/**
 * Tests the connection to the Portainer API by fetching system status.
 * @returns {Promise<boolean>} A promise that resolves to true if the connection is successful.
 */
export async function testConnection(): Promise<boolean> {
    try {
        if (!portainerGetClient.auth.isValidated) {
            throw new Error('Authentication not validated. Cannot test connection.');
        }

        await portainerGetClient.auth.axiosInstance.get('/api/system/status');
        console.log('Successfully connected to Portainer API.');
        return true;
    } catch (error) {
        console.error('Failed to connect to Portainer API:', error);
        return false;
    }
}

/**
 * Get a container by name
 * @param containerName - The name of the container to find
 * @param environmentId - The ID of the Portainer environment
 * @returns Promise resolving to the container object or null if not found
 */
export async function getContainerByName(containerName: string): Promise<PortainerContainer | null> {
    try {
        const containers = await portainerGetClient.getContainers(true);

        if (!containers) {
            console.error('No containers found in the specified environment.');
            return null;
        }

        const container = containers.find(c =>
            c.Names.some(name => name.includes(containerName)) ||
            c.Names.some(name => name === `/${containerName}`) ||
            c.Names.some(name => name.replace('/', '') === containerName)
        );

        return container || null;
    } catch (error) {
        console.error(`Failed to get container by name "${containerName}":`, error);
        return null;
    }
}