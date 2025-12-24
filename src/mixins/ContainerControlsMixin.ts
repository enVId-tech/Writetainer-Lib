import { logError, logInfo } from "../../logger.ts";
import type { Constructor } from "../types.ts";

interface CCtrlMixin {
    auth: {
        axiosInstance: import("axios").AxiosInstance;
    };
    ensureEnvId: () => Promise<number | null>;
}

export function ContainerControlsMixin<TBase extends Constructor<CCtrlMixin>>(Base: TBase) {
    return class extends Base {
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
                    logError('No Portainer environments found. Cannot start container.');
                    return false;
                }
        
                try {
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/start`);
                    logInfo(`Container ${containerId} started successfully.`);
                    return true;
                } catch (error) {
                    logError(`Failed to start container ${containerId}:`, error);
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
                    logError('No Portainer environments found. Cannot stop container.');
                    return false;
                }
        
                try {
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/stop`);
                    logInfo(`Container ${containerId} stopped successfully.`);
                    return true;
                } catch (error) {
                    logError(`Failed to stop container ${containerId}:`, error);
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
                    logError('No Portainer environments found. Cannot remove container.');
                    return false;
                }
        
                try {
                    logInfo(`Removing container ${containerId}...`);
                    const params = new URLSearchParams();
                    if (force) params.append('force', 'true');
                    if (removeVolumes) params.append('v', 'true');
        
                    const url = `/api/endpoints/${environmentId}/docker/containers/${containerId}?${params.toString()}`;
                    await this.auth.axiosInstance.delete(url);
                    logInfo('Container removed successfully');
                    return true;
                } catch (error) {
                    logError(`Failed to remove container ${containerId}:`, error);
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
                    logError('No Portainer environments found. Cannot kill container.');
                    return false;
                }
        
                try {
                    logInfo(`Killing container ${containerId} with signal ${signal}...`);
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/kill?signal=${signal}`);
                    logInfo('Container killed successfully');
                    return true;
                } catch (error) {
                    logError(`Failed to kill container ${containerId}:`, error);
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
                    logError('No Portainer environments found. Cannot pause container.');
                    return false;
                }
        
                try {
                    logInfo(`Pausing container ${containerId}...`);
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/pause`);
                    logInfo('Container paused successfully');
                    return true;
                } catch (error) {
                    logError(`Failed to pause container ${containerId}:`, error);
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
                    logError('No Portainer environments found. Cannot unpause container.');
                    return false;
                }
        
                try {
                    logInfo(`Unpausing container ${containerId}...`);
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/unpause`);
                    logInfo('Container unpaused successfully');
                    return true;
                } catch (error) {
                    logError(`Failed to unpause container ${containerId}:`, error);
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
                    logError('No Portainer environments found. Cannot restart container.');
                    return false;
                }
        
                try {
                    logInfo(`Restarting container ${containerId}...`);
                    await this.auth.axiosInstance.post(`/api/endpoints/${environmentId}/docker/containers/${containerId}/restart?t=${(timeout / 1000).toPrecision(2)}`);
                    logInfo('Container restarted successfully');
                    return true;
                } catch (error) {
                    logError(`Failed to restart container ${containerId}:`, error);
                    return false;
                }
            }
    }
}