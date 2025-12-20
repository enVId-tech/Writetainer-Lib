import { portainerClient } from "./api";

export async function getFirstEnvironmentId(): Promise<number | null> {
    try {
        const environments = await portainerClient.getEnvironments();
        return environments.length > 0 ? environments[0].Id : null;
    } catch (error) {
        console.error('Error getting first environment ID:', error);
        return Promise.resolve(null);
    }
}