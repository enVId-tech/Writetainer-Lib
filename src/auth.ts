import axios, { type AxiosInstance } from 'axios';
import https from 'https';
import { logError } from '../logger.ts';

export class PortainerAuth {
    private static instance: PortainerAuth;
    private readonly portainerUrl: string; // Portainer URL, must be defined
    private readonly apiKey: string; // Access token, must be defined for API calls
    public readonly axiosInstance: AxiosInstance;
    public isValidated: boolean; // Indicates if authentication has been validated

    /**
     * Constructor for PortainerAuth
     * @param portainerUrl - The URL of the Portainer instance.
     * @param apiKey - The API key for authentication.
     */
    private constructor(
        portainerUrl: string,
        apiKey: string
    ) {
        this.portainerUrl = portainerUrl.endsWith('/') ? portainerUrl.slice(0, -1) : portainerUrl;
        this.apiKey = apiKey;
        this.isValidated = false;

        // Create an Axios instance with default configurations
        this.axiosInstance = axios.create({
            baseURL: this.portainerUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            // For development: ignore SSL certificate validation when using IP addresses
            // TODO: CHANGE LATER - this is insecure for production use
            httpsAgent: (process.env.NODE_ENV !== 'production') ?
                new https.Agent({ rejectUnauthorized: false }) :
                undefined,
        });

        // Set initial auth headers
        this.updateAuthHeaders();

        // Add an interceptor for common error handling or logging
        this.axiosInstance.interceptors.response.use(
            response => response,
            async error => {
                const config = error.config;
                const errorMessage = error.message || 'An unknown error occurred.';

                logError(`Portainer API Error: ${errorMessage}`);
                if (config) {
                    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
                    logError(`Request: ${config.method?.toUpperCase()} ${fullUrl}`);
                }

                if (errorMessage.includes('Client sent an HTTP request to an HTTPS server')) {
                    logError('Hint: This error suggests a protocol mismatch. Your PORTAINER_URL in your .env file might be using "http://" when it should be "https://". Please verify the URL and protocol.');
                }

                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    logError(`Response Status: ${error.response.status}`);
                    logError('Response Data:', error.response.data);
                } else if (error.request) {
                    // The request was made but no response was received
                    logError('No response received from Portainer. Check network connectivity, firewall rules, and if the Portainer instance is running at the specified URL.');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    logError('An error occurred while setting up the request.');
                }

                // Throw the error again to allow the caller to handle it
                return Promise.reject(error);
            }
        );
    }

    // Singleton instance to improve performance by reusing the same auth instance
    public static getInstance(): PortainerAuth {
        if (!PortainerAuth.instance) {
            const portainerUrl = process.env.PORTAINER_URL;
            const apiKey = process.env.PORTAINER_API_KEY;
            if (!portainerUrl || !apiKey) {
                throw new Error('PORTAINER_URL and PORTAINER_API_KEY must be defined in environment variables.');
            }
            PortainerAuth.instance = new PortainerAuth(portainerUrl, apiKey);
        }
        return PortainerAuth.instance;
    }

    private updateAuthHeaders() {
        this.axiosInstance.defaults.headers['X-API-Key'] = this.apiKey;
        this.isValidated = true;
    }

    /**
     * Gets the portainer URL.
     * @return {string} The Portainer URL.
     */
    public get PortainerUrl(): string {
        return this.portainerUrl;
    }
}