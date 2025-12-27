import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PortainerFactory } from "../src/factory.ts";
import * as utils from "../src/utils.ts";

// Mock the PortainerApi
vi.mock("../src/api", () => {
    const mockAxiosInstance = {
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn()
    };

    return {
        PortainerApi: {
            getInstance: vi.fn(() => ({
                auth: {
                    axiosInstance: mockAxiosInstance
                },
                ensureEnvId: vi.fn(),
                cleanupExistingContainer: vi.fn()
            }))
        }
    };
});

// Mock utility functions
vi.mock("../src/utils", () => ({
    getStackByName: vi.fn(),
    verifyStackCreation: vi.fn(),
    verifyContainerCreation: vi.fn()
}));

describe("PortainerFactory Tests", () => {
    let factory: PortainerFactory;
    let mockPortainerClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Reset the singleton instance before each test
        (PortainerFactory as any).instance = undefined;
        
        factory = PortainerFactory.getInstance(1);
        mockPortainerClient = (factory as any).portainerClient;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("getInstance()", () => {
        it("should return a singleton instance", () => {
            const instance1 = PortainerFactory.getInstance(1);
            const instance2 = PortainerFactory.getInstance(2);

            expect(instance1).toBe(instance2);
        });

        it("should create instance with environment ID", () => {
            (PortainerFactory as any).instance = undefined;
            const instance = PortainerFactory.getInstance(5);

            expect(instance).toBeInstanceOf(PortainerFactory);
        });
    });

    describe("createStack()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid stackData types", async () => {
                const result1 = await factory.createStack(null as any);
                const result2 = await factory.createStack(undefined as any);
                const result3 = await factory.createStack("invalid" as any);
                const result4 = await factory.createStack(123 as any);
                const result5 = await factory.createStack([] as any);

                expect(result1).toBeUndefined();
                expect(result2).toBeUndefined();
                expect(result3).toBeUndefined();
                expect(result4).toBeUndefined();
                expect(result5).toBeUndefined();
            });

            it("should reject invalid maxRetryCount types", async () => {
                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result1 = await factory.createStack(stackData, "invalid" as any);
                const result2 = await factory.createStack(stackData, NaN);

                expect(result1).toBeUndefined();
                expect(result2).toBeUndefined();
            });

            it("should reject invalid timeoutMs types", async () => {
                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result1 = await factory.createStack(stackData, 3, "invalid" as any);
                const result2 = await factory.createStack(stackData, 3, NaN);

                expect(result1).toBeUndefined();
                expect(result2).toBeUndefined();
            });

            it("should return undefined when environment ID is null", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(null);
                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };

                const result = await factory.createStack(stackData);

                expect(result).toBeUndefined();
            });

            it("should return undefined when Name is missing", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                const stackData = { ComposeFile: "version: '3'" };

                const result = await factory.createStack(stackData);

                expect(result).toBeUndefined();
            });

            it("should return undefined when ComposeFile is missing", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                const stackData = { Name: "test-stack" };

                const result = await factory.createStack(stackData);

                expect(result).toBeUndefined();
            });
        });

        describe("Default Values", () => {
            it("should accept undefined for optional maxRetryCount parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData, undefined);

                expect(result).toBeDefined();
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should accept null for optional maxRetryCount parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData, null as any);

                expect(result).toBeDefined();
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should accept undefined for optional timeoutMs parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData, 3, undefined);

                expect(result).toBeDefined();
                expect(utils.verifyStackCreation).toHaveBeenCalled();
            });

            it("should accept null for optional timeoutMs parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData, 3, null as any);

                expect(result).toBeDefined();
                expect(utils.verifyStackCreation).toHaveBeenCalled();
            });

            it("should use default maxRetryCount of 3", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                await factory.createStack(stackData);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should use default timeoutMs of 5000", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                await factory.createStack(stackData);

                expect(utils.verifyStackCreation).toHaveBeenCalled();
            });

            it("should handle negative maxRetryCount and use default", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                await factory.createStack(stackData, -5);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should handle negative timeoutMs and use default", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                await factory.createStack(stackData, 3, -1000);

                expect(utils.verifyStackCreation).toHaveBeenCalled();
            });
        });

        describe("Stack Creation", () => {
            it("should return existing stack if one with the same name exists", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                const existingStack = { Id: 5, Name: "test-stack", EndpointId: 1 };
                vi.mocked(utils.getStackByName).mockResolvedValue(existingStack);

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData);

                expect(result).toEqual(existingStack);
                expect(mockPortainerClient.auth.axiosInstance.post).not.toHaveBeenCalled();
            });

            it("should create stack successfully on first attempt", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                const mockResponse = { data: { Id: 1, Name: "test-stack" } };
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue(mockResponse);

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData);

                expect(result).toEqual(mockResponse.data);
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalledWith(
                    expect.stringContaining("/api/stacks/create/standalone/string"),
                    expect.objectContaining({
                        Name: "test-stack",
                        StackFileContent: "version: '3'",
                        Env: []
                    })
                );
            });

            it("should retry stack creation when verification fails", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation)
                    .mockResolvedValueOnce(false)
                    .mockResolvedValueOnce(true);
                const mockResponse = { data: { Id: 1, Name: "test-stack" } };
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue(mockResponse);

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData, 3, 1000);

                expect(result).toEqual(mockResponse.data);
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalledTimes(2);
            });

            it("should return empty object after max retries", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(false);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData, 2, 100);

                expect(result).toEqual({});
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalledTimes(2);
            });

            it("should include environment variables in payload", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                vi.mocked(utils.verifyStackCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post.mockResolvedValue({ 
                    data: { Id: 1, Name: "test-stack" } 
                });

                const stackData = { 
                    Name: "test-stack", 
                    ComposeFile: "version: '3'",
                    Env: [{ name: "KEY", value: "value" }]
                };
                await factory.createStack(stackData);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.objectContaining({
                        Env: [{ name: "KEY", value: "value" }]
                    })
                );
            });

            it("should handle API errors gracefully", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                vi.mocked(utils.getStackByName).mockResolvedValue(null);
                mockPortainerClient.auth.axiosInstance.post.mockRejectedValue(new Error("API Error"));

                const stackData = { Name: "test-stack", ComposeFile: "version: '3'" };
                const result = await factory.createStack(stackData);

                expect(result).toBeUndefined();
            });
        });
    });

    describe("createContainer()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid stackData types", async () => {
                const result1 = await factory.createContainer(null as any);
                const result2 = await factory.createContainer(undefined as any);
                const result3 = await factory.createContainer("invalid" as any);
                const result4 = await factory.createContainer(123 as any);
                const result5 = await factory.createContainer([] as any);

                expect(result1).toBeUndefined();
                expect(result2).toBeUndefined();
                expect(result3).toBeUndefined();
                expect(result4).toBeUndefined();
                expect(result5).toBeUndefined();
            });

            it("should reject invalid maxRetryCount types", async () => {
                const stackData = { Name: "test-container", ContainerPayload: {} };
                const result1 = await factory.createContainer(stackData, "invalid" as any);
                const result2 = await factory.createContainer(stackData, NaN);

                expect(result1).toBeUndefined();
                expect(result2).toBeUndefined();
            });

            it("should reject invalid timeoutMs types", async () => {
                const stackData = { Name: "test-container", ContainerPayload: {} };
                const result1 = await factory.createContainer(stackData, 3, "invalid" as any);
                const result2 = await factory.createContainer(stackData, 3, NaN);

                expect(result1).toBeUndefined();
                expect(result2).toBeUndefined();
            });
        });

        describe("Default Values", () => {
            it("should accept undefined for optional maxRetryCount parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData, undefined);

                expect(result).toBeDefined();
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should accept null for optional maxRetryCount parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData, null as any);

                expect(result).toBeDefined();
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should accept undefined for optional timeoutMs parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData, 3, undefined);

                expect(result).toBeDefined();
                expect(utils.verifyContainerCreation).toHaveBeenCalled();
            });

            it("should accept null for optional timeoutMs parameter", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData, 3, null as any);

                expect(result).toBeDefined();
                expect(utils.verifyContainerCreation).toHaveBeenCalled();
            });

            it("should use default maxRetryCount of 3", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                await factory.createContainer(stackData);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should handle negative maxRetryCount and use default", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                await factory.createContainer(stackData, -5);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });

            it("should handle negative timeoutMs and use default", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                await factory.createContainer(stackData, 3, -1000);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalled();
            });
        });

        describe("Container Creation", () => {
            it("should sanitize container name", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "Test Container!", ContainerPayload: { Image: "nginx" } };
                await factory.createContainer(stackData);

                expect(mockPortainerClient.cleanupExistingContainer).toHaveBeenCalledWith("test-container-");
            });

            it("should cleanup existing container before creation", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(true);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                await factory.createContainer(stackData);

                expect(mockPortainerClient.cleanupExistingContainer).toHaveBeenCalledWith("testcontainer");
            });

            it("should create and start container successfully", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData);

                expect(result).toEqual({
                    Id: "abc123",
                    Name: "testcontainer",
                    method: "direct-container",
                    containerCreated: true,
                    verified: true
                });
                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalledTimes(2);
            });

            it("should retry container creation when verification fails", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation)
                    .mockResolvedValueOnce(false)
                    .mockResolvedValueOnce(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValue({ data: { Id: "abc123" } })

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData, 3, 100);

                expect(result).toEqual({
                    Id: "abc123",
                    Name: "testcontainer",
                    method: "direct-container",
                    containerCreated: true,
                    verified: true
                });
            });

            it("should return empty object after max retries", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(false);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValue({ data: { Id: "abc123" } })
                    .mockResolvedValue({ data: {} });

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData, 2, 100);

                expect(result).toEqual({});
            });

            it("should handle API errors gracefully", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                mockPortainerClient.auth.axiosInstance.post.mockRejectedValue(new Error("API Error"));

                const stackData = { Name: "TestContainer", ContainerPayload: { Image: "nginx" } };
                const result = await factory.createContainer(stackData);

                expect(result).toBeUndefined();
            });

            it("should pass container payload to API", async () => {
                mockPortainerClient.ensureEnvId.mockResolvedValue(1);
                mockPortainerClient.cleanupExistingContainer.mockResolvedValue(false);
                vi.mocked(utils.verifyContainerCreation).mockResolvedValue(true);
                mockPortainerClient.auth.axiosInstance.post
                    .mockResolvedValueOnce({ data: { Id: "abc123" } })
                    .mockResolvedValueOnce({ data: {} });

                const payload = { 
                    Image: "nginx:latest",
                    Env: ["VAR=value"]
                };
                const stackData = { Name: "TestContainer", ContainerPayload: payload };
                await factory.createContainer(stackData);

                expect(mockPortainerClient.auth.axiosInstance.post).toHaveBeenCalledWith(
                    expect.stringContaining("/docker/containers/create?name=testcontainer"),
                    payload
                );
            });
        });
    });
});
