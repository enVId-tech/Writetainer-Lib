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
                        logInfo(`Starting container ${controls.containerId}...`);
                        await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/start`);
                        logInfo('Container started successfully');
                        break;
                    case 'stop':
                        logInfo(`Stopping container ${controls.containerId}...`);
                        await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/stop`);
                        logInfo('Container stopped successfully');
                        break;
                    case 'remove':
                        {
                            logInfo(`Removing container ${controls.containerId}...`);
                            const params = new URLSearchParams();
                            if (controls.options?.force) params.append('force', 'true');
                            if (controls.options?.removeVolumes) params.append('v', 'true');
                            const url = `/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}?${params.toString()}`;
                            await this.auth.axiosInstance.delete(url);
                            logInfo('Container removed successfully');
                        }
                    case 'kill':
                        {
                            const signal = controls.options?.signal || 'SIGKILL';
                            logInfo(`Killing container ${controls.containerId} with signal ${signal}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/kill?signal=${signal}`);
                            logInfo('Container killed successfully');
                        }
                    case 'pause':
                        {
                            logInfo(`Pausing container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/pause`);
                            logInfo('Container paused successfully');
                        }
                    case 'unpause':
                        {
                            logInfo(`Unpausing container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/unpause`);
                            logInfo('Container unpaused successfully');
                        }
                    case 'restart':
                        {
                            const timeout = controls.options?.timeout || 10000;
                            logInfo(`Restarting container ${controls.containerId}...`);
                            await this.auth.axiosInstance.post(`/api/endpoints/${controls.environmentId}/docker/containers/${controls.containerId}/restart?t=${(timeout / 1000).toPrecision(2)}`);
                            logInfo('Container restarted successfully');
                        }
                }
                return true;
            }
            catch (error) {
                logError(`Failed to ${controls.action} container ${controls.containerId}:`, error);
                return false;
            }
        }
    }
}