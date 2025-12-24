
import { PortainerAuth } from './auth.ts';
import type { PortainerStack, PortainerEnvironment, PortainerContainer, PortainerImage } from './interfaces.ts';
import { getFirstEnvironmentId, getStackById, getStackByName } from './utils.ts';
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
export class PortainerApi {
    public static instance: PortainerApi;
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
    ): PortainerApi {
        if (!PortainerApi.instance) {
            PortainerApi.instance = new PortainerApi(environmentId);
        }

        return PortainerApi.instance;
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
     * @param includeAll - Whether to include all containers (running, stopped, etc.).
     * @param environmentId - Optional: The ID of the Portainer environment. Defaults to `this.defaultEnvironmentId`.
     * @returns {Promise<PortainerContainer[]>} A promise that resolves to an array of container objects.
     */
    async getContainers(includeAll: boolean, environmentId?: number | null): Promise<PortainerContainer[] | undefined> {
        // If no environment ID is provided and no default is set, try to get the first one
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot fetch containers.');
            return undefined;
        }

        try {
            const params = { all: includeAll };
            const response = await this.auth.axiosInstance.get<PortainerContainer[]>(`/api/endpoints/${environmentId}/docker/containers/json`, { params });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch containers: ${error}`);
        }
    }

    /**
     * Fetches detailed information about a specific container within a Portainer environment.
     * @param containerId - The ID of the container to fetch details for.
     * @param environmentId - Optional: The ID of the Portainer environment, uses the set environmentId by default
     * @returns {Promise<PortainerContainer>} A promise that resolves to the container object.
     */
    async getContainerDetails(containerId: string, environmentId?: number | null): Promise<PortainerContainer> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            throw new Error('No Portainer environments found. Cannot fetch container details.');
        }

        if (!containerId) {
            throw new Error('Container ID is required to fetch container details.');
        }
        try {
            const response = await this.auth.axiosInstance.get<PortainerContainer>(`/api/endpoints/${environmentId}/docker/containers/${containerId}/json`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch details for container ${containerId} in environment ${environmentId}:`, error);
            throw error;
        }
    }

    /**
     * Fetches a list of all Docker images within a specific Portainer environment.
     * This proxies the Docker API's /images/json endpoint.
     * @param environmentId - Optional: The ID of the Portainer environment.
     * @returns {Promise<PortainerImage[]>} A promise that resolves to an array of image objects.
     */
    async getImages(environmentId?: number | null): Promise<PortainerImage[]> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            throw new Error('No Portainer environments found. Cannot fetch images.');
        }

        try {
            const response = await this.auth.axiosInstance.get<PortainerImage[]>(`/api/endpoints/${environmentId}/docker/images/json`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch images for environment ${environmentId}:`, error);
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

    /**
     * Clean up any existing container with the same name
     * @param containerName - The name of the container to clean up
     * @param environmentId - Optional: The ID of the Portainer environment
     */
    async cleanupExistingContainer(containerName: string, environmentId?: number | null): Promise<void> {
        try {
            if (environmentId === null || environmentId === undefined) {
                environmentId = await this.ensureEnvId();
            }

            if (environmentId === null) {
                throw new Error('No Portainer environments found. Cannot cleanup container.');
            }

            const containers = await this.getContainers(true);
            if (!containers) {
                console.error("No containers found, canceled cleanup operation.")
                return
            }
            const existingContainer = containers.find(c =>
                c.Names.some(name => name.includes(containerName)) ||
                c.Names.some(name => name === `/${containerName}`)
            );

            if (existingContainer) {
                console.log(`Cleaning up existing container "${containerName}" (ID: ${existingContainer.Id})`);

                if (existingContainer.State === 'running') {
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${existingContainer.Id}/stop`);
                    console.log('Container stopped');
                }

                // Remove the container
                await this.auth.axiosInstance.delete(`/api/endpoints/${environmentId}/docker/containers/${existingContainer.Id}`);
                console.log('Container removed');
            }
        } catch (error) {
            console.warn(`Warning: Failed to cleanup existing container "${containerName}":`, error);
        }
    }

    /**
     * Delete a stack from Portainer using the given stack id.
     * @param stackId - The ID of the stack to delete
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns Promise resolving to the delete operation result
     */
    deleteStack(stackId: number, environmentId?: number | null): Promise<Record<string, unknown>>;
    /**
    * Delete a stack from Portainer using the given stack id.
    * @param stackId - The ID of the stack to delete
    * @param environmentId - Optional: The ID of the Portainer environment
    * @returns Promise resolving to the delete operation result
    */
    deleteStack(stackName: string, environmentId?: number | null): Promise<Record<string, unknown>>;

    /**
     * Delete a stack from Portainer using the given stack id.
     * @param stackId - The ID of the stack to delete
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns Promise resolving to the delete operation result
     */
    async deleteStack(stackId: number | string, environmentId?: number | null): Promise<Record<string, unknown>> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            throw new Error('No Portainer environments found. Cannot delete stack.');
        }

        if (typeof stackId === "number") {
            const stack = await getStackById(stackId, environmentId);
            if (!stack) {
                throw new Error(`Stack ID ${stackId} does not exist in environment ${environmentId}`);
            }
        }

        if (typeof stackId === "string") {
            const stack = await getStackByName(stackId);
            if (!stack) {
                throw new Error(`Stack with name "${stackId}" does not exist in environment ${environmentId}`);
            }
            stackId = stack.Id;
        }

        try {
            console.log(`Deleting stack ${stackId} from environment ${environmentId}...`);
            const response = await this.auth.axiosInstance.delete(`/api/stacks/${stackId}?endpointId=${environmentId}`);
            console.log('Stack deleted successfully');
            return response.data;
        } catch (error) {
            console.error(`Failed to delete stack ${stackId}:`, error);
            throw error;
        }
    }

    /**
     * Start a container in a specific environment
     * @param containerId - The ID of the container to start
     * @param environmentId - Optional: The ID of the Portainer environment
     */
    async startContainer(containerId: string, environmentId?: number | null): Promise<void> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            throw new Error('No Portainer environments found. Cannot start container.');
        }

        try {
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/start`);
            console.log(`Container ${containerId} started successfully.`);
        } catch (error) {
            console.error(`Failed to start container ${containerId}:`, error);
            throw error;
        }
    }

    /**
     * Stop a container in a specific environment
     * @param containerId - The ID of the container to stop
     * @param environmentId - Optional: The ID of the Portainer environment
     */
    async stopContainer(containerId: string, environmentId?: number | null): Promise<void> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            throw new Error('No Portainer environments found. Cannot stop container.');
        }

        try {
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/stop`);
            console.log(`Container ${containerId} stopped successfully.`);
        } catch (error) {
            console.error(`Failed to stop container ${containerId}:`, error);
            throw error;
        }
    }
}

