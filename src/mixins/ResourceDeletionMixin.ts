import { logError, logInfo, logWarn } from "../../logger.ts";
import type { Constructor } from "../types.ts";
import { getStackById, getStackByName } from "../utils.ts";

interface RDMixin {
    auth: {
        axiosInstance: import("axios").AxiosInstance;
    };
    ensureEnvId: () => Promise<number | null>;
    getContainers: (includeAll: boolean, environmentId?: number | null) => Promise<import("../types.ts").PortainerContainer[] | undefined>;
}

export function ResourceDeletionMixin<TBase extends Constructor<RDMixin>>(Base: TBase) {
    return class extends Base {
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
                        logError('No Portainer environments found. Cannot cleanup container.');
                        return false;
                    }
        
                    const containers = await this.getContainers(true);
                    if (!containers) {
                        logError("No containers found, canceled cleanup operation.")
                        return false;
                    }
                    const existingContainer = containers.find(c =>
                        c.Names.some(name => name.includes(containerName)) ||
                        c.Names.some(name => name === `/${containerName}`)
                    );
        
                    if (existingContainer) {
                        logInfo(`Cleaning up existing container "${containerName}" (ID: ${existingContainer.Id})`);
        
                        if (existingContainer.State === 'running') {
                            await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${existingContainer.Id}/stop`);
                            logInfo('Container stopped');
                        }
        
                        // Remove the container
                        await this.auth.axiosInstance.delete(`/api/endpoints/${environmentId}/docker/containers/${existingContainer.Id}`);
                        logInfo('Container removed');
                        return true;
                    }
                    return false; // No existing container found
                } catch (error) {
                    logWarn(`Warning: Failed to cleanup existing container "${containerName}":`, error);
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
                    logError('No Portainer environments found. Cannot delete stack.');
                    return undefined;
                }
        
                if (typeof stackId === "number") {
                    const stack = await getStackById(stackId, environmentId);
                    if (!stack) {
                        logError(`Stack ID ${stackId} does not exist in environment ${environmentId}`);
                        return undefined;
                    }
                }
        
                if (typeof stackId === "string") {
                    const stack = await getStackByName(stackId);
                    if (!stack) {
                        logError(`Stack with name "${stackId}" does not exist in environment ${environmentId}`);
                        return undefined;
                    }
                    stackId = stack.Id;
                }
        
                try {
                    logInfo(`Deleting stack ${stackId} from environment ${environmentId}...`);
                    const response = await this.auth.axiosInstance.delete(`/api/stacks/${stackId}?endpointId=${environmentId}`);
                    logInfo('Stack deleted successfully');
                    return response.data;
                } catch (error) {
                    logError(`Failed to delete stack ${stackId}:`, error);
                    return undefined;
                }
            }
    }
}