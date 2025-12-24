import { logError } from "../../logger.ts";
import type { Constructor, PortainerContainer, PortainerImage, PortainerStack } from "../types.ts";

interface RFMixin {
    auth: {
        axiosInstance: import("axios").AxiosInstance;
    };
    ensureEnvId: () => Promise<number | null>;
}

export function ResourceFetchingMixin<TBase extends Constructor<RFMixin>>(Base: TBase) {
    return class extends Base {
        /**
         * Fetches a list of all stacks managed by Portainer.
         * @returns {Promise<PortainerStack[] | undefined>} A promise that resolves to an array of stack objects.
         */
        async getStacks(): Promise<PortainerStack[] | undefined> {
            try {
                const response = await this.auth.axiosInstance.get<PortainerStack[]>('/api/stacks');
                return response.data;
            } catch (error) {
                logError('Failed to fetch stacks:', error);
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
                logError('No Portainer environments found. Cannot fetch containers.');
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
                logError('No Portainer environments found. Cannot fetch container details.');
                return undefined;
            }

            if (!identifier) {
                logError('Container ID is required to fetch container details.');
                return undefined;
            }

            const containers = await this.getContainers(true, environmentId);

            if (!containers) {
                logError('No containers found in the specified environment.');
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
                logError('No Portainer environments found. Cannot fetch images.');
                return undefined;
            }

            try {
                const response = await this.auth.axiosInstance.get<PortainerImage[]>(`/api/endpoints/${environmentId}/docker/images/json`);
                return response.data;
            } catch (error) {
                logError(`Failed to fetch images for environment ${environmentId}:`, error);
                return undefined;
            }
        }

        async getStatus(): Promise<any | undefined> {
            try {
                const response = await this.auth.axiosInstance.get('/api/system/status');
                return response.data;
            } catch (error) {
                logError('Failed to fetch system status:', error);
                return undefined;
            }
        }

    }
}