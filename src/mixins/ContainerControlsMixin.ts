import { logError, logInfo } from "../../logger.ts";
import type { Constructor } from "../types.ts";

interface CCtrlMixin {
    auth: {
        axiosInstance: import("axios").AxiosInstance;
    };
    ensureEnvId: () => Promise<number | null>;
}

interface ContainerControls {
    action: 'start' | 'stop' | 'remove' | 'kill' | 'pause' | 'unpause' | 'restart';
    containerId: string;
    environmentId?: number | null;
    options?: {
        force?: boolean;
        removeVolumes?: boolean;
        signal?: string;
        timeout?: number;
    };
}

export function ContainerControlsMixin<TBase extends Constructor<CCtrlMixin>>(Base: TBase) {
    return class extends Base {
        async handleContainer(controls: ContainerControls): Promise<boolean> {
            if (!controls || typeof controls !== 'object') {
                logError('Invalid controls: must be an object');
                return false;
            }

            if (!controls.action || typeof controls.action !== 'string') {
                logError('Invalid action: must be a string');
                return false;
            }

            const validActions = ['start', 'stop', 'remove', 'kill', 'pause', 'unpause', 'restart'];
            if (!validActions.includes(controls.action)) {
                logError(`Invalid action: must be one of ${validActions.join(', ')}`);
                return false;
            }

            if (!controls.containerId || typeof controls.containerId !== 'string') {
                logError('Invalid containerId: must be a non-empty string');
                return false;
            }

            if (controls.environmentId !== undefined && controls.environmentId !== null && (typeof controls.environmentId !== 'number' || isNaN(controls.environmentId))) {
                logError('Invalid environmentId: must be a number, null, or undefined');
                return false;
            }

            if (controls.options) {
                if (typeof controls.options !== 'object') {
                    logError('Invalid options: must be an object');
                    return false;
                }
                if (controls.options.force !== undefined && typeof controls.options.force !== 'boolean') {
                    logError('Invalid options.force: must be a boolean');
                    return false;
                }
                if (controls.options.removeVolumes !== undefined && typeof controls.options.removeVolumes !== 'boolean') {
                    logError('Invalid options.removeVolumes: must be a boolean');
                    return false;
                }
                if (controls.options.signal !== undefined && typeof controls.options.signal !== 'string') {
                    logError('Invalid options.signal: must be a string');
                    return false;
                }
                if (controls.options.timeout !== undefined && (typeof controls.options.timeout !== 'number' || isNaN(controls.options.timeout) || controls.options.timeout < 0)) {
                    logError('Invalid options.timeout: must be a non-negative number');
                    return false;
                }
            }

            if (controls.environmentId === null || controls.environmentId === undefined) {
                controls.environmentId = await this.ensureEnvId();
            }

            if (controls.environmentId === null) {
                logError('No Portainer environments found. Cannot perform container action.');
                return false;
            }

            try {
                switch (controls.action) {
                    case 'start':
                        {
                            logInfo(`Starting container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/start`);
                            logInfo('Container started successfully');
                            break;
                        }
                    case 'stop':
                        {
                            logInfo(`Stopping container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/stop`);
                            logInfo('Container stopped successfully');
                            break;
                        }
                    case 'remove':
                        {
                            logInfo(`Removing container ${controls.containerId}...`);
                            const params = new URLSearchParams();
                            if (controls.options?.force) params.append('force', 'true');
                            if (controls.options?.removeVolumes) params.append('v', 'true');
                            const url = `/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}?${params.toString()}`;
                            await this.auth.axiosInstance.delete(url);
                            logInfo('Container removed successfully');
                            break;
                        }
                    case 'kill':
                        {
                            const signal = controls.options?.signal || 'SIGKILL';
                            logInfo(`Killing container ${controls.containerId} with signal ${signal}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/kill?signal=${signal}`);
                            logInfo('Container killed successfully');
                            break;
                        }
                    case 'pause':
                        {
                            logInfo(`Pausing container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/pause`);
                            logInfo('Container paused successfully');
                            break;
                        }
                    case 'unpause':
                        {
                            logInfo(`Unpausing container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/unpause`);
                            logInfo('Container unpaused successfully');
                            break;
                        }
                    case 'restart':
                        {
                            const timeout = controls.options?.timeout || 10000;
                            logInfo(`Restarting container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/restart?t=${(timeout / 1000).toPrecision(2)}`);
                            logInfo('Container restarted successfully');
                            break;
                        }
                    default:
                        logError(`Unknown action: ${controls.action}`);
                        return false;
                }
                return true;
            }
            catch (error) {
                logError(`Failed to ${controls.action} container ${controls.containerId}:`, error);
                return false;
            }
        }

        /**
 * Pull the latest image for a container
 * @param imageName - The name of the image to pull
 * @param environmentId - Optional: The ID of the Portainer environment
 * @returns {Promise<boolean>} Promise resolving when image is pulled
 */
        async pullImage(
            imageName: string,
            environmentId?: number | null): Promise<boolean> {
            if (!imageName || typeof imageName !== 'string') {
                logError('Invalid imageName: must be a non-empty string');
                return false;
            }

            if (environmentId !== undefined && environmentId !== null && (typeof environmentId !== 'number' || isNaN(environmentId))) {
                environmentId = await this.ensureEnvId();
            }

            if (environmentId === null) {
                logError('No Portainer environments found. Cannot pull image.');
                return false;
            }

            try {
                logInfo(`Pulling image ${imageName}...`);
                await this.auth.axiosInstance.post(
                    `/api/endpoints/${environmentId}/docker/images/create?fromImage=${encodeURIComponent(imageName)}`
                );
                logInfo(`Image ${imageName} pulled successfully`);
                return true;
            } catch (error) {
                logError(`Failed to pull image ${imageName}:`, error);
                return false;
            }
        }

        /**
         * Update container resources (CPU and memory limits)
         * @param containerId - The ID of the container to update
         * @param environmentId - The ID of the Portainer environment
         * @param resources - The resource limits to apply
         * @returns {Promise<boolean>} - Promise resolving when resources are updated
         */
        async updateContainerResources(
            containerId: string,
            resources: {
                cpuQuota?: number; // CPU quota in microseconds per CPU period
                cpuPeriod?: number; // CPU period in microseconds 
                memory?: number;   // Memory limit in bytes
            },
            environmentId?: number | null,
        ): Promise<boolean> {
            if (!containerId || typeof containerId !== 'string') {
                logError('Invalid containerId: must be a non-empty string');
                return false;
            }

            if (environmentId !== undefined && environmentId !== null && (typeof environmentId !== 'number' || isNaN(environmentId))) {
                environmentId = await this.ensureEnvId();
            }

            if (environmentId === null) {
                logError('No Portainer environments found. Cannot update container resources.');
                return false;
            }

            if (!resources || typeof resources !== 'object') {
                logError('Invalid resources: must be an object');
                return false;
            }

            if (resources.cpuQuota !== undefined && (typeof resources.cpuQuota !== 'number' || isNaN(resources.cpuQuota) || resources.cpuQuota < 0)) {
                logError('Invalid resources.cpuQuota: must be a non-negative number');
                return false;
            }

            if (resources.cpuPeriod !== undefined && (typeof resources.cpuPeriod !== 'number' || isNaN(resources.cpuPeriod) || resources.cpuPeriod <= 0)) {
                logError('Invalid resources.cpuPeriod: must be a positive number');
                return false;
            }

            if (resources.memory !== undefined && (typeof resources.memory !== 'number' || isNaN(resources.memory) || resources.memory < 0)) {
                logError('Invalid resources.memory: must be a non-negative number');
                return false;
            }

            try {
                logInfo(`Updating resources for container ${containerId}...`);

                // Get current container configuration
                const containerInfo = await this.auth.axiosInstance.get(
                    `/api/endpoints/${environmentId}/docker/containers/${containerId}/json`
                );

                const updateConfig = {
                    Memory: resources.memory || containerInfo.data.HostConfig.Memory,
                    CpuQuota: resources.cpuQuota || containerInfo.data.HostConfig.CpuQuota,
                    CpuPeriod: resources.cpuPeriod || containerInfo.data.HostConfig.CpuPeriod,
                    // Preserve other existing configurations
                    RestartPolicy: containerInfo.data.HostConfig.RestartPolicy,
                };

                await this.auth.axiosInstance.post(
                    `/api/endpoints/${environmentId}/docker/containers/${containerId}/update`,
                    updateConfig
                );

                logInfo(`Container resources updated successfully`);
                return true;
            } catch (error) {
                logError(`Failed to update container resources for ${containerId}:`, error);
                return false;
            }
        }
    }
}