import { PortainerApiGetClient } from "./api.ts";
import { getStackByName } from "./utils.ts";

export class PortainerFactory {
    public static instance: PortainerFactory;
    private portainerClient: PortainerApiGetClient;

    private constructor(
        environmentId: number | null = null
    ) {
        this.portainerClient = PortainerApiGetClient.getInstance(environmentId);
    }

    public static getInstance(
        environmentId: number | null = null
    ): PortainerFactory {
        if (!PortainerFactory.instance) {
            PortainerFactory.instance = new PortainerFactory(environmentId);
        }
        return PortainerFactory.instance;
    }

    /**
     * Creates a stack based on a given compose format
     * Valid for Portainer API >2.19.x
     * @param stackData - An object containing stack creation data
     * @param stackData.Name - The name of the stack, immutable after creation
     * @param stackData.ComposeFile - The Docker compose file as a single string, must be valid Docker notation
     * @param stackData.Env - Optional: An array of objects with a string key and string value. Can be omitted if none are present.
     * @param stackData.FromAppTemplate - Optional: Marks if current stack should be an app template.
     * @returns {Promise<Record<string, unknown>>} A promise that resolves to the created stack object or an empty object on failure.
     */
    public async createStack(stackData: Record<string, unknown>): Promise<Record<string, unknown>> {
        if (this.portainerClient.ensureEnvId() === null) {
            throw new Error('Environment ID is required to create a stack.');
        }

        const stackName = stackData.Name as string;
        const composeContent = (stackData.ComposeFile) as string;

        if (!stackName || !composeContent) {
            throw new Error('Stack name and compose content are required');
        }

        // Make sure the stack doesn't already exist
        const existingStack = await getStackByName(stackName);
        if (existingStack) {
            console.warn(`Stack with name "${stackName}" already exists (ID: ${existingStack.Id}). Skipping creation.`);
            return existingStack as unknown as Record<string, unknown>;
        }

        const envId: number | null = await this.portainerClient.ensureEnvId();

        // If no env id, return an error
        if (!envId && typeof envId !== "number") {
            throw new Error("Environment ID is undefined or the wrong type when creating a stack.")
        }

        try {
            const payload = {
                Name: stackName,
                StackFileContent: composeContent,
                Env: stackData.Env || []
            };

            const response = await this.portainerClient.auth.axiosInstance.post(
                `/api/stacks/create/standalone/string?endpointId=${envId}&type=2`,
                payload
            );
            return response.data;
        } catch (error) {
            console.error('Failed to create stack:', error);
            return {};
        }
    }

    async createContainer(stackData: Record<string, unknown>): Promise<Record<string, unknown>> {
        const stackName = stackData.Name as string;
        const composeContent = stackData.ComposeFile as string;
        const serviceName = stackName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        return {};        
    }
}