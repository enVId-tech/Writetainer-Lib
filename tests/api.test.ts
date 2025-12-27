import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PortainerApi } from "../src/api.ts";
import { PortainerAuth } from "../src/auth.ts";

// Mock PortainerAuth
vi.mock("../src/auth", () => {
    const mockAxiosInstance = {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        defaults: {
            baseURL: "https://portainer.example.com",
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'test-api-key'
            }
        }
    };

    return {
        PortainerAuth: {
            getInstance: vi.fn(() => ({
                axiosInstance: mockAxiosInstance,
                isValidated: true,
                PortainerUrl: "https://portainer.example.com"
            }))
        }
    };
});

// Mock mixins to avoid complex dependencies
vi.mock("../src/mixins/EnvironmentMixins.ts", () => ({
    EnvironmentsMixin: (Base: any) => Base
}));

vi.mock("../src/mixins/ResourceFetchingMixin.ts", () => ({
    ResourceFetchingMixin: (Base: any) => Base
}));

vi.mock("../src/mixins/ResourceDeletionMixin.ts", () => ({
    ResourceDeletionMixin: (Base: any) => Base
}));

vi.mock("../src/mixins/ContainerControlsMixin.ts", () => ({
    ContainerControlsMixin: (Base: any) => Base
}));

vi.mock("../src/mixins/StackControlsMixin.ts", () => ({
    StackControlsMixin: (Base: any) => Base
}));

describe("PortainerApi Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset singleton instance before each test
        (PortainerApi as any).instance = undefined;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("getInstance()", () => {
        it("should create instance with null environment ID", () => {
            const instance = PortainerApi.getInstance(null);

            expect(instance).toBeInstanceOf(PortainerApi);
            expect(instance.environmentId).toBe(null);
        });

        it("should create instance with specific environment ID", () => {
            const instance = PortainerApi.getInstance(5);

            expect(instance).toBeInstanceOf(PortainerApi);
            expect(instance.environmentId).toBe(5);
        });

        it("should return same singleton instance on multiple calls", () => {
            const instance1 = PortainerApi.getInstance(1);
            const instance2 = PortainerApi.getInstance(2);

            expect(instance1).toBe(instance2);
        });

        it("should keep the first environment ID even if called with different ID", () => {
            const instance1 = PortainerApi.getInstance(1);
            const instance2 = PortainerApi.getInstance(5);

            expect(instance1).toBe(instance2);
            expect(instance1.environmentId).toBe(1);
            expect(instance2.environmentId).toBe(1);
        });

        it("should initialize with PortainerAuth instance", () => {
            const instance = PortainerApi.getInstance(1);

            expect(instance.auth).toBeDefined();
            expect(PortainerAuth.getInstance).toHaveBeenCalled();
        });
    });

    describe("Constructor", () => {
        it("should not allow direct instantiation", () => {
            // The constructor is private, so we verify the singleton pattern works
            const instance1 = PortainerApi.getInstance();
            const instance2 = PortainerApi.getInstance();

            expect(instance1).toBe(instance2);
        });

        it("should set environmentId to null by default", () => {
            const instance = PortainerApi.getInstance();

            expect(instance.environmentId).toBe(null);
        });

        it("should set environmentId when provided", () => {
            const instance = PortainerApi.getInstance(42);

            expect(instance.environmentId).toBe(42);
        });
    });

    describe("auth property", () => {
        it("should have auth property set", () => {
            const instance = PortainerApi.getInstance();

            expect(instance.auth).toBeDefined();
        });

        it("should get PortainerAuth instance", () => {
            const instance = PortainerApi.getInstance();

            expect(instance.auth.isValidated).toBe(true);
            expect(instance.auth.PortainerUrl).toBe("https://portainer.example.com");
        });

        it("should have access to axiosInstance through auth", () => {
            const instance = PortainerApi.getInstance();

            expect(instance.auth.axiosInstance).toBeDefined();
            expect(instance.auth.axiosInstance.get).toBeDefined();
            expect(instance.auth.axiosInstance.post).toBeDefined();
            expect(instance.auth.axiosInstance.delete).toBeDefined();
        });
    });

    describe("environmentId property", () => {
        it("should allow reading environmentId", () => {
            const instance = PortainerApi.getInstance(10);

            expect(instance.environmentId).toBe(10);
        });

        it("should allow setting environmentId", () => {
            const instance = PortainerApi.getInstance(10);
            
            instance.environmentId = 20;

            expect(instance.environmentId).toBe(20);
        });

        it("should allow setting environmentId to null", () => {
            const instance = PortainerApi.getInstance(10);
            
            instance.environmentId = null;

            expect(instance.environmentId).toBe(null);
        });

        it("should handle zero as valid environment ID", () => {
            (PortainerApi as any).instance = undefined;
            const instance = PortainerApi.getInstance(0);

            expect(instance.environmentId).toBe(0);
        });

        it("should handle negative environment ID", () => {
            (PortainerApi as any).instance = undefined;
            const instance = PortainerApi.getInstance(-1);

            expect(instance.environmentId).toBe(-1);
        });
    });

    describe("Singleton pattern enforcement", () => {
        it("should always return the same instance regardless of parameters", () => {
            const instances = [
                PortainerApi.getInstance(1),
                PortainerApi.getInstance(2),
                PortainerApi.getInstance(null),
                PortainerApi.getInstance(100),
                PortainerApi.getInstance()
            ];

            // All instances should be the same object
            instances.forEach(instance => {
                expect(instance).toBe(instances[0]);
            });
        });

        it("should maintain singleton across multiple access patterns", () => {
            const instance1 = PortainerApi.getInstance(5);
            const instance2 = PortainerApi.getInstance();
            const directAccess = PortainerApi.instance;

            expect(instance1).toBe(instance2);
            expect(instance1).toBe(directAccess);
        });

        it("should allow accessing singleton via static property", () => {
            const instance = PortainerApi.getInstance(1);
            
            expect(PortainerApi.instance).toBe(instance);
            expect(PortainerApi.instance).toBeInstanceOf(PortainerApi);
        });
    });

    describe("Mixin integration", () => {
        it("should be an instance of the base class with all mixins applied", () => {
            const instance = PortainerApi.getInstance();

            expect(instance).toBeInstanceOf(PortainerApi);
        });

        it("should maintain properties from base class", () => {
            const instance = PortainerApi.getInstance(7);

            expect(instance.auth).toBeDefined();
            expect(instance.environmentId).toBe(7);
        });
    });
});
