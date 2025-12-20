
import { PortainerAuth } from './auth.ts';
import type { PortainerStack, PortainerEnvironment, PortainerContainer } from './interfaces.ts';
import { getFirstEnvironmentId } from './utils.ts';
/**
 * Portainer API Client
 * 
 * Handles portainer API interactions.
 */
class PortainerApiClient {
    private environmentId: number | null = null; // Environment ID, can be null on init but must be defined when used
    private _environmentIdValidated: boolean = false;
    private auth: PortainerAuth;

    constructor(
        portainerUrl: string, 
        apiToken: string,
        environmentId: number | null = null
    ) {
        // Creates class of upstream PortainerAuth instance
        this.environmentId = environmentId;
        this._environmentIdValidated = environmentId !== null;
        this.auth = new PortainerAuth(portainerUrl, apiToken);
    }

    /**
     * Gets the default environment ID.
     */
    public get DefaultEnvironmentId(): number | null {
        return this.environmentId;
    }

    set DefaultEnvironmentId(environmentId: number | null) {
        if (environmentId === null || typeof environmentId === 'number') {
            this.environmentId = environmentId;
            this._environmentIdValidated = false; // Reset validation when changed
        }
    }

    /**
     * Fetches details of a specific Portainer environment.
     * @param environmentId - The ID of the environment to fetch.
     * @returns {Promise<PortainerEnvironment>} A promise that resolves to the environment object.
     */
    async getEnvironment(environmentId: number): Promise<PortainerEnvironment> {
        try {
            if (!this.auth.isValidated) {
                throw new Error('Authentication not validated. Cannot fetch environment.');
            }

            const response = await this.auth.axiosInstance.get<PortainerEnvironment>(`/api/endpoints/${environmentId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch environment ${environmentId}:`, error);
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
     * Tests the connection to the Portainer API by fetching system status.
     * @returns {Promise<boolean>} A promise that resolves to true if the connection is successful.
     */
    async testConnection(): Promise<boolean> {
        try {
            if (!this.auth.isValidated) {
                throw new Error('Authentication not validated. Cannot test connection.');
            }

            await this.auth.axiosInstance.get('/api/system/status');
            console.log('Successfully connected to Portainer API.');
            return true;
        } catch (error) {
            console.error('Failed to connect to Portainer API:', error);
            return false;
        }
    }
}

// Create one instance to be used globally
export const portainerClient = new PortainerApiClient(
    process.env.PORTAINER_URL || 'http://localhost:9000',
    process.env.PORTAINER_API_TOKEN || ''
);