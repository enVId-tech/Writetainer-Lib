
import { PortainerAuth } from './auth';
import { PortainerEnvironment } from './interfaces';
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
            const response = await this.axiosInstance.get<PortainerEnvironment>(`/api/endpoints/${environmentId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch environment ${environmentId}:`, error);
            throw error;
        }
    }
}