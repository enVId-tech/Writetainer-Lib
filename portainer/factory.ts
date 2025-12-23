import { PortainerApi } from "./api.ts";
import { getStackByName, verifyContainerCreation, verifyStackCreation } from "./utils.ts";

export class PortainerFactory {
    public static instance: PortainerFactory;
    private portainerClient: PortainerApi;

    private constructor(
        environmentId: number | null = null
    ) {
        this.portainerClient = PortainerApi.getInstance(environmentId);
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
     * @param maxRetryCount - Optional: Number of times to retry making the stack if creation fails
     * @param timeoutMs - Optional: Time between each retry attempt (in ms)
     * @returns {Promise<Record<string, unknown>>} A promise that resolves to the created stack object or an empty object on failure.
     */
    public async createStack(stackData: Record<string, unknown>, maxRetryCount?: number, timeoutMs?: number): Promise<Record<string, unknown>> {
        if (this.portainerClient.ensureEnvId() === null) {
            throw new Error('Environment ID is required to create a stack.');
        }


        if (!maxRetryCount) {
            maxRetryCount = 3;
        } else if (Math.floor(maxRetryCount) < 0) {
            console.warn("Max retry count is an invalid number, setting to default value of 3.")
            maxRetryCount = 3;
        } else {
            maxRetryCount = Math.floor(maxRetryCount);
        }

        if (!timeoutMs) {
            timeoutMs = 5000;
        } else if (Math.floor(timeoutMs) < 0) {
            console.warn("timeoutMs is an invalid number, setting it to default value of 5000 ms.");
            timeoutMs = 5000;
        } else {
            timeoutMs = Math.floor(timeoutMs);
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
            for (let i = 0; i < maxRetryCount; i++) {
                const payload = {
                    Name: stackName,
                    StackFileContent: composeContent,
                    Env: stackData.Env || []
                };

                const response = await this.portainerClient.auth.axiosInstance.post(
                    `/api/stacks/create/standalone/string?endpointId=${envId}&type=2`,
                    payload
                );

                console.log(`Stack created, waiting ${timeoutMs} milliseconds (${timeoutMs / 1000} seconds) for verification.`)

                if (!await verifyStackCreation(stackName, timeoutMs)) {
                    console.warn(`Stack verification attempt ${i} / ${maxRetryCount} failed, retrying...`)
                } else {
                    return response.data;
                }
            }
            return {};
        } catch (error) {
            console.error('Failed to create stack:', error);
            return {};
        }
    }

    /**
     * Creates a container based on a given compose format
     * Valid for Portainer API >2.19.x
     * @param stackData - An object containing container creation data
     * @param stackData.Name - The name of the container, immutable after creation
     * @param stackData.ContainerPayload - The Docker compose file as a single string, must be valid Docker notation
     * @param maxRetryCount - Optional: Number of times to retry making the stack if creation fails
     * @param timeoutMs - Optional: Time between each retry attempt (in ms)
     * @returns {Promise<Record<string, unknown>>} A promise that resolves to the created stack object or an empty object on failure.
     */
    async createContainer(stackData: Record<string, unknown>, maxRetryCount?: number, timeoutMs?: number): Promise<Record<string, unknown>> {
        const stackName = stackData.Name as string;
        const composeContent = (stackData.ContainerPayload) as string;
        const serviceName = stackName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

        if (!maxRetryCount) {
            maxRetryCount = 3;
        } else if (Math.floor(maxRetryCount) < 0) {
            console.warn("Max retry count is an invalid number, setting to default value of 3.")
            maxRetryCount = 3;
        } else {
            maxRetryCount = Math.floor(maxRetryCount);
        }

        if (!timeoutMs) {
            timeoutMs = 5000;
        } else if (Math.floor(timeoutMs) < 0) {
            console.warn("timeoutMs is an invalid number, setting it to default value of 5000 ms.");
            timeoutMs = 5000;
        } else {
            timeoutMs = Math.floor(timeoutMs);
        }

        // Clean up any existing container with the same name
        await this.portainerClient.cleanupExistingContainer(serviceName);

        for (let i = 0; i < maxRetryCount; i++) {
            console.log('Creating container...');
            const response = await this.portainerClient.auth.axiosInstance.post(
                `/api/endpoints/${this.portainerClient.ensureEnvId()}/docker/containers/create?name=${serviceName}`,
                composeContent
            );

            console.log('Container created successfully!');
            const containerId = response.data.Id;

            // Start the container
            console.log('Starting container...');
            await this.portainerClient.auth.axiosInstance.post(`/api/endpoints/${this.portainerClient.ensureEnvId()}/docker/containers/${containerId}/start`);

            // Verify container creation
            console.log(`Stack created, waiting ${timeoutMs} milliseconds (${timeoutMs / 1000} seconds) for verification.`)

            if (!await verifyContainerCreation(serviceName, 10000)) {
                console.warn(`Stack verification attempt ${i} / ${maxRetryCount} failed, retrying...`)
            } else {
                console.log('Container started and verified successfully!');
                return {
                    Id: containerId,
                    Name: serviceName,
                    method: 'direct-container',
                    containerCreated: true,
                    verified: true
                };
            }
        }

        console.error(`Container could not be verfied after ${maxRetryCount} attempts over ${maxRetryCount * timeoutMs}.`)
        return {}
    }
}