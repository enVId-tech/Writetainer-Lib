import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PortainerAuth } from "../src/auth.ts";

describe("PortainerAuth Tests", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
        
        // Reset singleton instance before each test
        (PortainerAuth as any).instance = undefined;
        
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe("getInstance()", () => {
        it("should create instance with valid environment variables", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance).toBeInstanceOf(PortainerAuth);
            expect(instance.isValidated).toBe(true);
        });

        it("should return same singleton instance on multiple calls", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance1 = PortainerAuth.getInstance();
            const instance2 = PortainerAuth.getInstance();

            expect(instance1).toBe(instance2);
        });

        it("should throw error when PORTAINER_URL is missing", () => {
            process.env.PORTAINER_API_KEY = "test-api-key";
            delete process.env.PORTAINER_URL;

            expect(() => PortainerAuth.getInstance()).toThrow(
                "PORTAINER_URL and PORTAINER_API_KEY must be defined in environment variables."
            );
        });

        it("should throw error when PORTAINER_API_KEY is missing", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            delete process.env.PORTAINER_API_KEY;

            expect(() => PortainerAuth.getInstance()).toThrow(
                "PORTAINER_URL and PORTAINER_API_KEY must be defined in environment variables."
            );
        });

        it("should throw error when both environment variables are missing", () => {
            delete process.env.PORTAINER_URL;
            delete process.env.PORTAINER_API_KEY;

            expect(() => PortainerAuth.getInstance()).toThrow(
                "PORTAINER_URL and PORTAINER_API_KEY must be defined in environment variables."
            );
        });

        it("should remove trailing slash from portainerUrl", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com/";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("https://portainer.example.com");
        });

        it("should keep portainerUrl without trailing slash unchanged", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("https://portainer.example.com");
        });
    });

    describe("axiosInstance()", () => {
        it("should create axios instance with correct baseURL", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.axiosInstance.defaults.baseURL).toBe("https://portainer.example.com");
        });

        it("should set Content-Type header to application/json", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.axiosInstance.defaults.headers['Content-Type']).toBe("application/json");
        });

        it("should set X-API-Key header with the API key", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key-12345";

            const instance = PortainerAuth.getInstance();

            expect(instance.axiosInstance.defaults.headers['X-API-Key']).toBe("test-api-key-12345");
        });

        it("should disable SSL verification in non-production environment", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";
            process.env.NODE_ENV = "development";

            const instance = PortainerAuth.getInstance();

            expect(instance.axiosInstance.defaults.httpsAgent).toBeDefined();
        });

        it("should enable SSL verification in production environment", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";
            process.env.NODE_ENV = "production";

            const instance = PortainerAuth.getInstance();

            expect(instance.axiosInstance.defaults.httpsAgent).toBeUndefined();
        });
    });

    describe("PortainerUrl getter", () => {
        it("should return the portainer URL", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("https://portainer.example.com");
        });

        it("should return URL without trailing slash even if provided with one", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com/";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("https://portainer.example.com");
        });
    });

    describe("isValidated()", () => {
        it("should be true after instance creation", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.isValidated).toBe(true);
        });

        it("should be true after headers are updated", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();
            
            // Call private method via any cast to test
            (instance as any).updateAuthHeaders();

            expect(instance.isValidated).toBe(true);
        });
    });

    describe("Axios interceptors", () => {
        it("should have response interceptor configured", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.axiosInstance.interceptors.response).toBeDefined();
        });

        it("should return response on successful request", async () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();
            const mockResponse = { data: { test: "data" }, status: 200, statusText: "OK", headers: {}, config: {} as any };

            // Mock axios get to return success
            vi.spyOn(instance.axiosInstance, 'get').mockResolvedValue(mockResponse);

            const response = await instance.axiosInstance.get('/test');

            expect(response).toEqual(mockResponse);
        });
    });

    describe("Environment variable handling", () => {
        it("should handle empty string PORTAINER_URL as missing", () => {
            process.env.PORTAINER_URL = "";
            process.env.PORTAINER_API_KEY = "test-api-key";

            expect(() => PortainerAuth.getInstance()).toThrow(
                "PORTAINER_URL and PORTAINER_API_KEY must be defined in environment variables."
            );
        });

        it("should handle empty string PORTAINER_API_KEY as missing", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com";
            process.env.PORTAINER_API_KEY = "";

            expect(() => PortainerAuth.getInstance()).toThrow(
                "PORTAINER_URL and PORTAINER_API_KEY must be defined in environment variables."
            );
        });

        it("should accept URLs with different protocols", () => {
            process.env.PORTAINER_URL = "http://portainer.example.com";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("http://portainer.example.com");
        });

        it("should accept URLs with IP addresses", () => {
            process.env.PORTAINER_URL = "https://192.168.1.100:9443";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("https://192.168.1.100:9443");
        });

        it("should accept URLs with ports", () => {
            process.env.PORTAINER_URL = "https://portainer.example.com:9000";
            process.env.PORTAINER_API_KEY = "test-api-key";

            const instance = PortainerAuth.getInstance();

            expect(instance.PortainerUrl).toBe("https://portainer.example.com:9000");
        });
    });
});
