import { PortainerApiGetClient } from "./api.ts";
import { getStackByName } from "./utils.ts";

export class PortainerFactory {
    public static instance: PortainerFactory;
    private portainerClient: PortainerApiGetClient;

    private constructor(
        portainerUrl: string,
        apiToken: string,
        environmentId: number | null = null
    ) {
        this.portainerClient = PortainerApiGetClient.getInstance(portainerUrl, apiToken, environmentId);
    }

    public static getInstance(
        portainerUrl: string,
        apiToken: string,
        environmentId: number | null = null
    ): PortainerFactory {
        if (!PortainerFactory.instance) {
            PortainerFactory.instance = new PortainerFactory(portainerUrl, apiToken, environmentId);
        }
        return PortainerFactory.instance;
    }
    async createStack(stackData: Record<string, unknown>): Promise<Record<string, unknown>> {
        if (this.portainerClient.envId === null) {
            throw new Error('Environment ID is required to create a stack.');
        }

        const stackName = stackData.Name as string;
        const composeContent = (stackData.ComposeFile || stackData.StackFileContent) as string;

        if (!stackName || !composeContent) {
            throw new Error('Stack name and compose content are required');
        }

        // Make sure the stack doesn't already exist
        const existingStack = await getStackByName(stackName);
        if (existingStack) {
            console.warn(`Stack with name "${stackName}" already exists (ID: ${existingStack.Id}). Skipping creation.`);
            return existingStack as unknown as Record<string, unknown>;
        }

        try {
            const payload = {
                Name: stackName,
                StackFileContent: composeContent,
                Env: stackData.Env || []
            };

            const response = await this.portainerClient.auth.axiosInstance.post(
                `/api/stacks/create/standalone/string?endpointId=${this.portainerClient.envId}&type=2`,
                payload
            );
            return response.data;
        } catch (error) {
            console.error('Failed to create stack:', error);
            return {};
        }
    }
}