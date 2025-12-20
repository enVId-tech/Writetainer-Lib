
import { PortainerAuth } from './auth.ts';
import type { PortainerStack, PortainerEnvironment } from './interfaces.ts';
/**
 * Portainer API Client
 * 
 * Handles portainer API interactions.
 */
export class PortainerApiClient extends PortainerAuth {
    private environmentId: number | null = null; // Environment ID, can be null on init but must be defined when used
    private _environmentIdValidated: boolean = false;

    constructor(portainerUrl: string, apiToken: string) {
        // Creates class of upstream PortainerAuth instance
        super(portainerUrl, apiToken);
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
            if (!this.isValidated) {
                throw new Error('Authentication not validated. Cannot fetch environment.');
            }

            const response = await this.axiosInstance.get<PortainerEnvironment>(`/api/endpoints/${environmentId}`);
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
            if (!this.isValidated) {
                throw new Error('Authentication not validated. Cannot fetch environments.');
            }

            const response = await this.axiosInstance.get<PortainerEnvironment[]>('/api/endpoints');
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
            const response = await this.axiosInstance.get<PortainerStack[]>('/api/stacks');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch stacks:', error);
            throw error;
        }
    }


    /**
     * Tests the connection to the Portainer API by fetching system status.
     * @returns {Promise<boolean>} A promise that resolves to true if the connection is successful.
     */
    async testConnection(): Promise<boolean> {
        try {
            if (!this.isValidated) {
                throw new Error('Authentication not validated. Cannot test connection.');
            }

            await this.axiosInstance.get('/api/system/status');
            console.log('Successfully connected to Portainer API.');
            return true;
        } catch (error) {
            console.error('Failed to connect to Portainer API:', error);
            return false;
        }
    }
}