import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResourceFetchingMixin } from "../../src/mixins/ResourceFetchingMixin.ts";

class MockBase {
    auth = {
        axiosInstance: {
            get: vi.fn()
        },
        isValidated: true
    };
    ensureEnvId = vi.fn();
}

const ResourceFetchingClass = ResourceFetchingMixin(MockBase as any);

describe("Resource Fetching Mixin Tests", () => {
    let instance: InstanceType<typeof ResourceFetchingClass>;

    beforeEach(() => {
        vi.clearAllMocks();
        instance = new ResourceFetchingClass();
    });

    describe("getStacks()", () => {
        it("should handle invalid authentication cycle gracefully", async () => {
            instance.auth.isValidated = false;

            const result = await instance.getStacks();

            expect(result).toBeUndefined();
            expect(instance.auth.axiosInstance.get).not.toHaveBeenCalled();
        });
        it("should handle API errors gracefully", async () => {
            instance.auth.axiosInstance.get.mockRejectedValue(new Error("API Error"));

            const result = await instance.getStacks();

            expect(instance.auth.axiosInstance.get).toBeCalled();
            expect(result).toBeUndefined();
        });
        it("should return a list of stacks for successful API call", async () => {
            instance.auth.axiosInstance.get.mockResolvedValue({ data: [{ Id: 1, Name: "Test Stack" }] });

            const result = await instance.getStacks();

            expect(instance.auth.axiosInstance.get).toHaveBeenCalledWith("/api/stacks");
            expect(result).toEqual([{ Id: 1, Name: "Test Stack" }]);
        });
    });
    describe("getContainers()", () => {
        it("should accept undefined for optional environmentId parameter", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockResolvedValue({ data: [{ Id: "abc123", Names: ["/test"] }] });
            
            const result = await instance.getContainers(true, undefined);
            
            expect(instance.ensureEnvId).toHaveBeenCalled();
            expect(result).toEqual([{ Id: "abc123", Names: ["/test"] }]);
        });

        it("should reject invalid includeAll types", async () => {
            const result1 = await instance.getContainers(null as any);
            const result2 = await instance.getContainers(undefined as any);
            const result3 = await instance.getContainers("true" as any);
            const result4 = await instance.getContainers(1 as any);
            
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
            expect(result3).toBeUndefined();
            expect(result4).toBeUndefined();
        });

        it("should reject invalid environmentId types", async () => {
            const result1 = await instance.getContainers(true, "invalid" as any);
            const result2 = await instance.getContainers(true, NaN as any);
            
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
        });

        it("should handle invalid authentication cycle gracefully", async () => {
            instance.auth.isValidated = false;

            const result = await instance.getContainers(true);

            expect(result).toBeUndefined();
            expect(instance.auth.axiosInstance.get).not.toHaveBeenCalled();
        });
        it("should handle invalid environment IDs correctly", async () => {
            instance.ensureEnvId.mockResolvedValue(null);

            const result = await instance.getContainers(true);

            expect(result).toBeUndefined();
            expect(instance.ensureEnvId).toHaveBeenCalled();
        });
        it("should handle API errors gracefully", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockRejectedValue(new Error("API Error"));

            try {
                await instance.getContainers(true, 1);
            } catch (error: any) {
                expect(error.message).toContain("Failed to fetch containers");
            }
        });
        it("should return a list of containers for successful API call", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockResolvedValue({ data: [{ Id: "abc123", Names: ["/test-container"] }] });

            const result = await instance.getContainers(true, 1);

            expect(instance.auth.axiosInstance.get).toHaveBeenCalledWith(
                "/api/endpoints/1/docker/containers/json",
                { params: { all: true } }
            );
            expect(result).toEqual([{ Id: "abc123", Names: ["/test-container"] }]);
        });
    });
    describe("getStatus()", () => {
        it("should handle invalid authentication cycle gracefully", async () => {
            instance.auth.isValidated = false;
            instance.auth.axiosInstance.get.mockResolvedValue({ data: { version: "2.0" } });

            const result = await instance.getStatus();

            // getStatus checks auth validation, so it should return undefined
            expect(result).toBeUndefined();
        });
        it("should handle API errors gracefully", async () => {
            instance.auth.axiosInstance.get.mockRejectedValue(new Error("API Error"));

            const result = await instance.getStatus();

            expect(result).toBeUndefined();
        });
        it("should return status information for successful API call", async () => {
            const mockStatus = { version: "2.19.0", edition: "CE" };
            instance.auth.axiosInstance.get.mockResolvedValue({ data: mockStatus });

            const result = await instance.getStatus();

            expect(instance.auth.axiosInstance.get).toHaveBeenCalledWith("/api/system/status");
            expect(result).toEqual(mockStatus);
        });
    });
    describe("getContainerDetails()", () => {
        it("should accept undefined for optional environmentId parameter", async () => {
            const mockContainer = { Id: "abc123", Names: ["/test"], State: "running" };
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockResolvedValue({ data: mockContainer });
            
            const result = await instance.getContainerDetails("test", undefined);
            
            expect(instance.ensureEnvId).toHaveBeenCalled();
            expect(result).toEqual(mockContainer);
        });

        it("should reject invalid identifier types", async () => {
            const result1 = await instance.getContainerDetails(null as any);
            const result2 = await instance.getContainerDetails(undefined as any);
            const result3 = await instance.getContainerDetails(123 as any);
            const result4 = await instance.getContainerDetails("" as any);
            
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
            expect(result3).toBeUndefined();
            expect(result4).toBeUndefined();
        });

        it("should reject invalid environmentId types", async () => {
            const result1 = await instance.getContainerDetails("test", "invalid" as any);
            const result2 = await instance.getContainerDetails("test", NaN as any);
            
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
        });

        it("should handle invalid environment ID gracefully", async () => {
            instance.ensureEnvId.mockResolvedValue(null);

            const result = await instance.getContainerDetails("test-container");

            expect(result).toBeUndefined();
            expect(instance.ensureEnvId).toHaveBeenCalled();
        });
        it("should handle missing container ID gracefully", async () => {
            instance.ensureEnvId.mockResolvedValue(1);

            const result = await instance.getContainerDetails("");

            expect(result).toBeUndefined();
        });
        it("should handle invalid container list fetching gracefully", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockRejectedValue(new Error("Failed to fetch containers"));

            try {
                await instance.getContainerDetails("test-container", 1);
            } catch (error: any) {
                expect(error.message).toContain("Failed to fetch containers");
            }
        });
        it("should try to run container details fetching successfully", async () => {
            const mockContainer = { Id: "abc123", Names: ["/test-container"], State: "running" };
            instance.ensureEnvId.mockResolvedValue(1);
            const spy = vi.spyOn(instance, "getContainers")
                .mockResolvedValue([mockContainer]);
            instance.auth.axiosInstance.get
                .mockResolvedValueOnce({ data: mockContainer }) // Direct API call succeeds

            const result = await instance.getContainerDetails("abc123", 1);

            expect(spy).toHaveBeenCalled();
            expect(result).toEqual(mockContainer);
        });
        it("should try to find container details by name if API call fails", async () => {
            const mockContainers = [
                { Id: "abc123", Names: ["/test-container"], State: "running" }
            ];
            instance.ensureEnvId.mockResolvedValue(1);
            const spy = vi.spyOn(instance, "getContainers")
                .mockResolvedValue(mockContainers);
            instance.auth.axiosInstance.get
                .mockRejectedValueOnce(new Error("Not found")) // Direct API call fails
            const result = await instance.getContainerDetails("test-container", 1);

            expect(spy).toHaveBeenCalled();
            expect(result).toEqual(mockContainers[0]);
        });
        it("should try to find container details by partial name if name finding fails", async () => {
            const mockContainers = [
                { Id: "abc123", Names: ["/my-test-container"], State: "running" }
            ];
            instance.ensureEnvId.mockResolvedValue(1);
            const spy = vi.spyOn(instance, "getContainers")
                .mockResolvedValue(mockContainers);
            instance.auth.axiosInstance.get
                .mockRejectedValueOnce(new Error("Not found")) // Direct API call fails

            const result = await instance.getContainerDetails("test", 1);

            expect(result).toEqual(mockContainers[0]);
        });
        it("should return container details or undefined appropriately", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get
                .mockRejectedValueOnce(new Error("Not found")) // Direct API call fails
                .mockResolvedValueOnce({ data: [] }); // getContainers returns empty

            const result = await instance.getContainerDetails("nonexistent", 1);

            expect(result).toBeUndefined();
        });
    });
    describe("getImages()", () => {
        it("should accept undefined for optional environmentId parameter", async () => {
            const mockImages = [{ Id: "img123", RepoTags: ["nginx:latest"] }];
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockResolvedValue({ data: mockImages });
            
            const result = await instance.getImages(undefined);
            
            expect(instance.ensureEnvId).toHaveBeenCalled();
            expect(result).toEqual(mockImages);
        });

        it("should reject invalid environmentId types", async () => {
            const result1 = await instance.getImages("invalid" as any);
            const result2 = await instance.getImages(NaN as any);
            
            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
        });

        it("should handle invalid environment ID gracefully", async () => {
            instance.ensureEnvId.mockResolvedValue(null);

            const result = await instance.getImages();

            expect(result).toBeUndefined();
            expect(instance.ensureEnvId).toHaveBeenCalled();
        });
        it("should handle invalid image list fetching gracefully", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockRejectedValue(new Error("API Error"));

            const result = await instance.getImages(1);

            expect(result).toBeUndefined();
        });
        it("should return a list of images for successful API call", async () => {
            const mockImages = [
                { Id: "img123", RepoTags: ["nginx:latest"], Created: 1234567890, Size: 1000000 }
            ];
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockResolvedValue({ data: mockImages });

            const result = await instance.getImages(1);

            expect(instance.auth.axiosInstance.get).toHaveBeenCalledWith(
                "/api/endpoints/1/docker/images/json"
            );
            expect(result).toEqual(mockImages);
        });
        it("should return undefined when no images are found or an error occurs", async () => {
            instance.ensureEnvId.mockResolvedValue(1);
            instance.auth.axiosInstance.get.mockRejectedValue(new Error("Not found"));

            const result = await instance.getImages(1);

            expect(result).toBeUndefined();
        });
    });
});