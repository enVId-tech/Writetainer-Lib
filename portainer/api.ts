
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

    /**
     * Constructor for PortainerApi
     * @param environmentId - Optional: The ID of the Portainer environment.
     */
    private constructor(
        environmentId: number | null = null
    ) {
        // Creates class of upstream PortainerAuth instance
        this.environmentId = environmentId;
        this.auth = PortainerAuth.getInstance();
    }

    /**
     * A publically accessible singleton instance of PortainerApi
     * @param environmentId - Optional: Environment Id for instance
     * @returns {PortainerApi} The singleton instance of PortainerApi
     */
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

    /**
     * Ensures that an environment ID is set, fetching the first available if not.
     * @returns {Promise<number | null>} The environment ID.
     */
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
     * @returns {Promise<PortainerEnvironment | undefined>} A promise that resolves to the environment object.
     */
    async getEnvironment(): Promise<PortainerEnvironment | undefined> {
        try {
            if (!this.auth.isValidated) {
                return undefined;
            }

            const response = await this.auth.axiosInstance.get<PortainerEnvironment>(`/api/endpoints/${this.environmentId}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch environment ${this.environmentId}:`, error);
            return undefined;
        }
    }

    /**
     * Fetches a list of all Portainer environments (endpoints).
     * @returns {Promise<PortainerEnvironment[] | undefined>} A promise that resolves to an array of environment objects.
     */
    async getEnvironments(): Promise<PortainerEnvironment[] | undefined> {
        try {
            if (!this.auth.isValidated) {
                return undefined;
            }

            const response = await this.auth.axiosInstance.get<PortainerEnvironment[]>('/api/endpoints');

            console.log(`Fetched ${response.data.length} environments from Portainer.`);

            return response.data;
        } catch (error) {
            console.error('Failed to fetch environments:', error);
            return undefined;
        }
    }

    /**
 * Fetches a list of all stacks managed by Portainer.
 * @returns {Promise<PortainerStack[] | undefined>} A promise that resolves to an array of stack objects.
 */
    async getStacks(): Promise<PortainerStack[] | undefined> {
        try {
            const response = await this.auth.axiosInstance.get<PortainerStack[]>('/api/stacks');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch stacks:', error);
            return undefined;
        }
    }

    /**
     * Fetches a list of all containers within a specific Portainer environment.
     * This proxies the Docker API's /containers/json endpoint.
     * @param includeAll - Whether to include all containers (running, stopped, etc.).
     * @param environmentId - Optional: The ID of the Portainer environment. Defaults to `this.defaultEnvironmentId`.
     * @returns {Promise<PortainerContainer[] | undefined>} A promise that resolves to an array of container objects.
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
     * @returns {Promise<PortainerContainer | undefined>} A promise that resolves to the container object.
     */
    async getContainerDetails(identifier: string, environmentId?: number | null): Promise<PortainerContainer | undefined> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot fetch container details.');
            return undefined;
        }

        if (!identifier) {
            console.error('Container ID is required to fetch container details.');
            return undefined;
        }

        const containers = await this.getContainers(true, environmentId);

        if (!containers) {
            console.error('No containers found in the specified environment.');
            return undefined;
        }

        let container: PortainerContainer | undefined = await this.auth.axiosInstance.get<PortainerContainer>(`/api/endpoints/${environmentId}/docker/containers/${identifier}/json`).then(res => res.data).catch(() => undefined);

        // If not found by ID, try to find by name
        if (!container) {
            container = containers.find(c =>
                c.Names.some(name =>
                    name.includes(identifier) || name === `/${identifier}`
                )
            );
        }

        // If still not found, search by partial name match
        if (!container) {
            container = containers.find(c =>
                c.Names.some(name => {
                    const cleanName = name.startsWith('/') ? name.substring(1) : name;
                    return cleanName.includes(identifier);
                })
            );
        }

        return container;
    }

    /**
     * Fetches a list of all Docker images within a specific Portainer environment.
     * This proxies the Docker API's /images/json endpoint.
     * @param environmentId - Optional: The ID of the Portainer environment.
     * @returns {Promise<PortainerImage[] | undefined>} A promise that resolves to an array of image objects.
     */
    async getImages(environmentId?: number | null): Promise<PortainerImage[] | undefined> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot fetch images.');
            return undefined;
        }

        try {
            const response = await this.auth.axiosInstance.get<PortainerImage[]>(`/api/endpoints/${environmentId}/docker/images/json`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch images for environment ${environmentId}:`, error);
            return undefined;
        }
    }

    async getStatus(): Promise<any | undefined> {
        try {
            const response = await this.auth.axiosInstance.get('/api/system/status');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch system status:', error);
            return undefined;
        }
    }

    /**
     * Clean up any existing container with the same name
     * @param containerName - The name of the container to clean up
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns {Promise<boolean>} Promise resolving to true if a container was cleaned up, false otherwise
     */
    async cleanupExistingContainer(containerName: string, environmentId?: number | null): Promise<boolean> {
        try {
            if (environmentId === null || environmentId === undefined) {
                environmentId = await this.ensureEnvId();
            }

            if (environmentId === null) {
                console.error('No Portainer environments found. Cannot cleanup container.');
                return false;
            }

            const containers = await this.getContainers(true);
            if (!containers) {
                console.error("No containers found, canceled cleanup operation.")
                return false;
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
                return true;
            }
            return false; // No existing container found
        } catch (error) {
            console.warn(`Warning: Failed to cleanup existing container "${containerName}":`, error);
            return false;
        }
    }

    /**
     * Delete a stack from Portainer using the given stack id.
     * @param stackId - The ID of the stack to delete
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns {Promise<Record<string, unknown> | undefined>} Promise resolving to the delete operation result
     */
    deleteStack(stackId: number, environmentId?: number | null): Promise<Record<string, unknown> | undefined>;
    /**
    * Delete a stack from Portainer using the given stack id.
    * @param stackId - The ID of the stack to delete
    * @param environmentId - Optional: The ID of the Portainer environment
    * @returns {Promise<Record<string, unknown> | undefined>} Promise resolving to the delete operation result
    */
    deleteStack(stackName: string, environmentId?: number | null): Promise<Record<string, unknown> | undefined>;

    /**
     * Delete a stack from Portainer using the given stack id.
     * @param stackId - The ID of the stack to delete
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns {Promise<Record<string, unknown> | undefined>} Promise resolving to the delete operation result
     */
    async deleteStack(stackId: number | string, environmentId?: number | null): Promise<Record<string, unknown> | undefined> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot delete stack.');
            return undefined;
        }

        if (typeof stackId === "number") {
            const stack = await getStackById(stackId, environmentId);
            if (!stack) {
                console.error(`Stack ID ${stackId} does not exist in environment ${environmentId}`);
                return undefined;
            }
        }

        if (typeof stackId === "string") {
            const stack = await getStackByName(stackId);
            if (!stack) {
                console.error(`Stack with name "${stackId}" does not exist in environment ${environmentId}`);
                return undefined;
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
            return undefined;
        }
    }

    /**
     * Start a container in a specific environment
     * @param containerId - The ID of the container to start
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns {Promise<boolean>} Promise resolving when container is started
     */
    async startContainer(containerId: string, environmentId?: number | null): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot start container.');
            return false;
        }

        try {
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/start`);
            console.log(`Container ${containerId} started successfully.`);
            return true;
        } catch (error) {
            console.error(`Failed to start container ${containerId}:`, error);
            return false;
        }
    }

    /**
     * Stop a container in a specific environment
     * @param containerId - The ID of the container to stop
     * @param environmentId - Optional: The ID of the Portainer environment
     * @returns {Promise<boolean>} Promise resolving when container is stopped
     */
    async stopContainer(containerId: string, environmentId?: number | null): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot stop container.');
            return false;
        }

        try {
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/stop`);
            console.log(`Container ${containerId} stopped successfully.`);
            return true;
        } catch (error) {
            console.error(`Failed to stop container ${containerId}:`, error);
            return false;
        }
    }
    /**
     * Remove a container
     * @param containerId - The ID of the container to remove
     * @param environmentId - The ID of the Portainer environment
     * @param force - Force removal of running container
     * @param removeVolumes - Remove associated volumes
     * @returns {Promise<boolean>} Promise resolving when container is removed
     */
    async removeContainer(containerId: string, environmentId?: number | null, force: boolean = false, removeVolumes: boolean = false): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot remove container.');
            return false;
        }

        try {
            console.log(`🗑️ Removing container ${containerId}...`);
            const params = new URLSearchParams();
            if (force) params.append('force', 'true');
            if (removeVolumes) params.append('v', 'true');

            const url = `/api/endpoints/${environmentId}/docker/containers/${containerId}?${params.toString()}`;
            await this.auth.axiosInstance.delete(url);
            console.log('Container removed successfully');
            return true;
        } catch (error) {
            console.error(`Failed to remove container ${containerId}:`, error);
            return false;
        }
    }

    /**
     * Kill a container (force stop)
     * @param containerId - The ID of the container to kill
     * @param environmentId - Optional: The ID of the Portainer environment
     * @param signal - Kill signal (default: SIGKILL)
     * @returns {Promise<boolean>} Promise resolving when container is killed
     */
    async killContainer(containerId: string, environmentId?: number | null, signal: string = 'SIGKILL'): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot kill container.');
            return false;
        }

        try {
            console.log(`Killing container ${containerId} with signal ${signal}...`);
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/kill?signal=${signal}`);
            console.log('Container killed successfully');
            return true;
        } catch (error) {
            console.error(`Failed to kill container ${containerId}:`, error);
            return false;
        }
    }

    /**
     * Pause a container
     * @param containerId - The ID of the container to pause
     * @param environmentId - The ID of the Portainer environment
     * @returns {Promise<boolean>} Promise resolving when container is paused
     */
    async pauseContainer(containerId: string, environmentId?: number | null): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot pause container.');
            return false;
        }

        try {
            console.log(`Pausing container ${containerId}...`);
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/pause`);
            console.log('Container paused successfully');
            return true;
        } catch (error) {
            console.error(`Failed to pause container ${containerId}:`, error);
            return false;
        }
    }

    /**
     * Unpause a container
     * @param containerId - The ID of the container to unpause
     * @param environmentId - The ID of the Portainer environment
     * @returns {Promise<boolean>} Promise resolving when container is unpaused
     */
    async unpauseContainer(containerId: string, environmentId?: number | null): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot unpause container.');
            return false;
        }

        try {
            console.log(`Unpausing container ${containerId}...`);
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/unpause`);
            console.log('Container unpaused successfully');
            return true;
        } catch (error) {
            console.error(`Failed to unpause container ${containerId}:`, error);
            return false;
        }
    }

    /**
     * Restart a container
     * @param containerId - The ID of the container to restart
     * @param environmentId - Optional: The ID of the Portainer environment
     * @param timeout - Optional: Timeout in seconds before forcefully killing the container (in ms)
     * @returns {Promise<boolean>} Promise resolving when container is restarted
     */
    async restartContainer(containerId: string, environmentId?: number | null, timeout: number = 10000): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot restart container.');
            return false;
        }

        try {
            console.log(`Restarting container ${containerId}...`);
            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/restart?t=${(timeout / 1000).toPrecision(2)}`);
            console.log('Container restarted successfully');
            return true;
        } catch (error) {
            console.error(`Failed to restart container ${containerId}:`, error);
            return false;
        }
    }

    /**
     * Start a stack
     * @param stackId - The ID of the stack to start
     * @param environmentId - The ID of the Portainer environment
     * @returns {Promise<boolean>} Promise resolving when stack is started
     */
    async startStack(stackId: number, environmentId?: number | null): Promise<boolean> {
        if (environmentId === null || environmentId === undefined) {
            environmentId = await this.ensureEnvId();
        }

        if (environmentId === null) {
            console.error('No Portainer environments found. Cannot start stack.');
            return false;
        }

        try {
            console.log(`▶️ Starting stack ${stackId}...`);
            await this.auth.axiosInstance.post(`/api/stacks/${stackId}/start?endpointId=${environmentId}`);
            console.log('Stack started successfully');
            return true;
        } catch (error) {
            console.error(`Failed to start stack ${stackId}:`, error);
            return false;
        }
    }
}