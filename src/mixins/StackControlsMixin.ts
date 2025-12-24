import { logError, logInfo } from "../../logger.ts";
import type { Constructor } from "../types.ts";

interface SCtrlsMixin {
    auth: {
        axiosInstance: import("axios").AxiosInstance;
    };
    ensureEnvId: () => Promise<number | null>;
}

export function StackControlsMixin<TBase extends Constructor<SCtrlsMixin>>(Base: TBase) {
    return class extends Base {
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
                logError('No Portainer environments found. Cannot start stack.');
                return false;
            }

            try {
                logInfo(`Starting stack ${stackId}...`);
                await this.auth.axiosInstance.post(`/api/stacks/${stackId}/start?endpointId=${environmentId}`);
                logInfo('Stack started successfully');
                return true;
            } catch (error) {
                logError(`Failed to start stack ${stackId}:`, error);
                return false;
            }
        }


        /**
         * Stop a stack
         * @param stackId - The ID of the stack to stop
         * @param environmentId - The ID of the Portainer environment
         * @returns {Promise<boolean>} Promise resolving when stack is stopped
         */
        async stopStack(stackId: number, environmentId?: number | null): Promise<boolean> {
            if (environmentId === null) {
                logError('Environment ID is required to stop a stack.');
                return false;
            }

            try {
                logInfo(`Stopping stack ${stackId}...`);
                await this.auth.axiosInstance.post(`/api/stacks/${stackId}/stop?endpointId=${environmentId}`);
                logInfo('Stack stopped successfully');
                return true;
            } catch (error) {
                logError(`Failed to stop stack ${stackId}:`, error);
                return false;
            }
        }
    }
}