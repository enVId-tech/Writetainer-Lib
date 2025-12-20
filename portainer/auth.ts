import axios, { type AxiosInstance } from 'axios';
import https from 'https';

export class PortainerAuth {
    private portainerUrl: string; // Portainer URL, must be defined
    private apiToken: string; // Access token, must be defined for API calls
    isValidated: boolean; // Indicates if authentication has been validated
    axiosInstance: AxiosInstance;

    /**
     * Constructor for PortainerAuth
     * @param portainerUrl - The URL of the Portainer instance.
     * @param apiToken - The API token for authentication.
     */
    constructor(
        portainerUrl: string,
        apiToken: string
    ) {
        this.portainerUrl = portainerUrl;
        this.apiToken = apiToken;
        this.isValidated = false;

        // Create an Axios instance with default configurations
        this.axiosInstance = axios.create({
            baseURL: this.portainerUrl,
            headers: {
                'Content-Type': 'application/json',
            },
            // For development: ignore SSL certificate validation when using IP addresses
            httpsAgent: (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) ?
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

                console.error(`Portainer API Error: ${errorMessage}`);
                if (config) {
                    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
                    console.error(`Request: ${config.method?.toUpperCase()} ${fullUrl}`);
                }

                if (errorMessage.includes('Client sent an HTTP request to an HTTPS server')) {
                    console.error('Hint: This error suggests a protocol mismatch. Your PORTAINER_URL in your .env file might be using "http://" when it should be "https://". Please verify the URL and protocol.');
                }

                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error(`Response Status: ${error.response.status}`);
                    console.error('Response Data:', error.response.data);
                } else if (error.request) {
                    // The request was made but no response was received
                    console.error('No response received from Portainer. Check network connectivity, firewall rules, and if the Portainer instance is running at the specified URL.');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('An error occurred while setting up the request.');
                }

                // You can throw the error again to allow the caller to handle it
                return Promise.reject(error);
            }
        );
    }

    private updateAuthHeaders() {
        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.apiToken}`;
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