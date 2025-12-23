
import { PortainerAuth } from './auth.ts';
import type { PortainerStack, PortainerEnvironment, PortainerContainer, PortainerImage } from './interfaces.ts';
import { getFirstEnvironmentId, getStackByName } from './utils.ts';
import dotenv from 'dotenv';

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


/**
 * Portainer API Client
 * 
 * Handles portainer API interactions.
 */
export class PortainerApiGetClient {
    public static instance: PortainerApiGetClient;
    public auth: PortainerAuth;

    private environmentId: number | null = null; // Environment ID, can be null on init but must be defined when used

    private constructor(
        environmentId: number | null = null
    ) {
        // Creates class of upstream PortainerAuth instance
        this.environmentId = environmentId;
        this.auth = PortainerAuth.getInstance();
    }

    public static getInstance(
        environmentId: number | null = null
    ): PortainerApiGetClient {
        if (!PortainerApiGetClient.instance) {
            PortainerApiGetClient.instance = new PortainerApiGetClient(environmentId);
        }

        return PortainerApiGetClient.instance;
    }

    /**
     * Gets the default environment ID.
     */
    private get envId(): number | null {
        return this.environmentId;
    }

    public async ensureEnvId(): Promise<number | null> {
        if (this.environmentId === null) {
            console.warn('Environment ID is not set, getting default environment ID.');
            const firstEnvId = getFirstEnvironmentId().then(id => {
                if (id === null || id === undefined) {
                    console.warn('No Portainer environments found.');
                    console.error("ALERT: Any Portainer operations requiring an environment ID will fail until one is set.");
                    return;
                }
                return id;
            })


            this.environmentId = firstEnvId as unknown as number | null;
        }

        return this.environmentId;
    }

    set setEnvironment(environmentId: number | null) {
        if (environmentId === null || typeof environmentId === 'number') {
            this.environmentId = environmentId;
        }
    }

    /**
     * Fetches details of a specific Portainer environment.
     * @param environmentId - The ID of the environment to fetch.
     * @returns {Promise<PortainerEnvironment>} A promise that resolves to the environment object.
     */
    async getEnvironment(): Promise<PortainerEnvironment> {
        try {
            if (!this.auth.isValidated) {
                throw new Error('Authentication not validated. Cannot fetch environment.');
            }

            const response = await this.auth.axiosInstance.get<PortainerEnvironment>(`/api/endpoints/${this.environmentId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch environment ${this.environmentId}:`, error);
            throw error;
        }
    }

    /**
     * Fetches a list of all Portainer environments (endpoints).
     * @returns {Promise<PortainerEnvironment[]>} A promise that resolves to an array of environment objects.
     */
    async getEnvironments(): Promise<PortainerEnvironment[]> {
        try {
            if (!this.auth.isValidated) {
                throw new Error('Authentication not validated. Cannot fetch environments.');
            }

            const response = await this.auth.axiosInstance.get<PortainerEnvironment[]>('/api/endpoints');

            console.log(`Fetched ${response.data.length} environments from Portainer.`);

            return response.data;
        } catch (error) {
            console.error('Failed to fetch environments:', error);
            throw error; // Re-throw to allow upstream handling
        }
    }

    /**
 * Fetches a list of all stacks managed by Portainer.
 * @returns {Promise<PortainerStack[]>} A promise that resolves to an array of stack objects.
 */
    async getStacks(): Promise<PortainerStack[]> {
        try {
            const response = await this.auth.axiosInstance.get<PortainerStack[]>('/api/stacks');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch stacks:', error);
            throw error;
        }
    }

    /**
 * Fetches a list of all containers within a specific Portainer environment.
 * This proxies the Docker API's /containers/json endpoint.
 * @param environmentId - The ID of the Portainer environment. Defaults to `this.defaultEnvironmentId`.
 * @param includeAll - Whether to include all containers (running, stopped, etc.).
 * @returns {Promise<PortainerContainer[]>} A promise that resolves to an array of container objects.
 */
    async getContainers(includeAll: boolean): Promise<PortainerContainer[] | undefined> {
        // If no environment ID is provided and no default is set, try to get the first one
        if (this.environmentId === null) {
            console.log('No environment ID provided for getContainers, attempting to fetch first available environment...');
            this.environmentId = await getFirstEnvironmentId();
            if (this.environmentId === null) {
                throw new Error('No Portainer environments found. Cannot fetch containers.');
            }
            console.log(`Using environment ID: ${this.environmentId}`);
        }

        try {
            const params = { all: includeAll };
            const response = await this.auth.axiosInstance.get<PortainerContainer[]>(`/api/endpoints/${this.environmentId}/docker/containers/json`, { params });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch containers: ${error}`);
        }
    }

    /**
     * Fetches detailed information about a specific container within a Portainer environment.
     * @param containerId - The ID of the container to fetch details for.
     * @param environmentId - The ID of the Portainer environment.
     * @returns {Promise<PortainerContainer>} A promise that resolves to the container object.
     */
    async getContainerDetails(containerId: string): Promise<PortainerContainer> {
        if (!containerId) {
            throw new Error('Container ID is required to fetch container details.');
        }
        try {
            const response = await this.auth.axiosInstance.get<PortainerContainer>(`/api/endpoints/${this.environmentId}/docker/containers/${containerId}/json`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch details for container ${containerId} in environment ${this.environmentId}:`, error);
            throw error;
        }
    }

    /**
     * Fetches a list of all Docker images within a specific Portainer environment.
     * This proxies the Docker API's /images/json endpoint.
     * @param environmentId - The ID of the Portainer environment.
     * @returns {Promise<PortainerImage[]>} A promise that resolves to an array of image objects.
     */
    async getImages(): Promise<PortainerImage[]> {
        if (this.environmentId === null) {
            throw new Error('Environment ID is required to fetch images.');
        }

        try {
            const response = await this.auth.axiosInstance.get<PortainerImage[]>(`/api/endpoints/${this.environmentId}/docker/images/json`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch images for environment ${this.environmentId}:`, error);
            throw error;
        }
    }

    async getStatus(): Promise<any> {
        try {
            const response = await this.auth.axiosInstance.get('/api/system/status');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch system status:', error);
            throw error;
        }
    }
}

