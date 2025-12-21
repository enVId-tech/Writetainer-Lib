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

export async function getContainerByDetails(
    criteria: { image?: string; label?: string }
): Promise<PortainerContainer | null> {
    if (!criteria.image && !criteria.label) {
        throw new Error('At least one search criteria (image or label) must be provided.');
    }

    try {
        const containers = await portainerGetClient.getContainers(true);
        if (!containers) {
            console.error('No containers found in the specified environment.');
            return null;
        }

        const container = await containers.find(container => {
            let matches = true;
            if (criteria.image) {
                matches = matches && container.Image === criteria.image;
            }
            if (criteria.label) {
                matches = matches && container.Labels && container.Labels[criteria.label] !== undefined;
            }
            return matches;
        });

        return container || null;
    } catch (error) {
        console.error('Failed to get container by details:', error);
        return null;
    }
}