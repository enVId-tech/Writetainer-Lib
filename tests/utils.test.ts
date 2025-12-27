import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as utils from "../src/utils.ts";
import { PortainerApi } from "../src/api.ts";

// Mock the PortainerApi
vi.mock("../src/api", () => {
    return {
        PortainerApi: {
            instance: {
                getEnvironments: vi.fn(),
                getContainers: vi.fn(),
                getStacks: vi.fn(),
                getContainerDetails: vi.fn()
            },
            getInstance: vi.fn(() => ({
                getContainerDetails: vi.fn()
            }))
        }
    };
});

describe("Utils Functions Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("getFirstEnvironmentId()", () => {
        it("should return the first environment ID when environments exist", async () => {
            const mockEnvironments = [
                { Id: 1, Name: "env1" },
                { Id: 2, Name: "env2" }
            ];
            vi.mocked(PortainerApi.instance.getEnvironments).mockResolvedValue(mockEnvironments);

            const result = await utils.getFirstEnvironmentId();

            expect(result).toBe(1);
            expect(PortainerApi.instance.getEnvironments).toHaveBeenCalled();
        });

        it("should return null when no environments exist", async () => {
            vi.mocked(PortainerApi.instance.getEnvironments).mockResolvedValue([]);

            const result = await utils.getFirstEnvironmentId();

            expect(result).toBe(null);
        });

        it("should return null when getEnvironments returns undefined", async () => {
            vi.mocked(PortainerApi.instance.getEnvironments).mockResolvedValue(undefined);

            const result = await utils.getFirstEnvironmentId();

            expect(result).toBe(null);
        });

        it("should handle errors gracefully", async () => {
            vi.mocked(PortainerApi.instance.getEnvironments).mockRejectedValue(new Error("API Error"));

            const result = await utils.getFirstEnvironmentId();

            expect(result).toBe(null);
        });
    });

    describe("getContainerByDetails()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid criteria types", async () => {
                const result1 = await utils.getContainerByDetails(null as any);
                const result2 = await utils.getContainerByDetails(undefined as any);
                const result3 = await utils.getContainerByDetails("invalid" as any);
                const result4 = await utils.getContainerByDetails(123 as any);

                expect(result1).toBe(null);
                expect(result2).toBe(null);
                expect(result3).toBe(null);
                expect(result4).toBe(null);
            });

            it("should reject when neither image nor label is provided", async () => {
                const result = await utils.getContainerByDetails({});

                expect(result).toBe(null);
            });

            it("should reject invalid image type", async () => {
                const result = await utils.getContainerByDetails({ image: 123 as any });

                expect(result).toBe(null);
            });

            it("should reject invalid label type", async () => {
                const result = await utils.getContainerByDetails({ label: 123 as any });

                expect(result).toBe(null);
            });
        });

        describe("Container Search", () => {
            it("should find container by image name", async () => {
                const mockContainers = [
                    { Id: "abc123", Image: "nginx:latest", Labels: {}, Names: ["/test"], State: "running", Status: "Up" },
                    { Id: "def456", Image: "redis:latest", Labels: {}, Names: ["/test2"], State: "running", Status: "Up" }
                ];
                vi.mocked(PortainerApi.instance.getContainers).mockResolvedValue(mockContainers);

                const result = await utils.getContainerByDetails({ image: "nginx:latest" });

                expect(result).toEqual(mockContainers[0]);
            });

            it("should find container by label", async () => {
                const mockContainers = [
                    { Id: "abc123", Image: "nginx:latest", Labels: { "app": "web" }, Names: ["/test"], State: "running", Status: "Up" },
                    { Id: "def456", Image: "redis:latest", Labels: { "app": "cache" }, Names: ["/test2"], State: "running", Status: "Up" }
                ];
                vi.mocked(PortainerApi.instance.getContainers).mockResolvedValue(mockContainers);

                const result = await utils.getContainerByDetails({ label: "app" });

                expect(result).toEqual(mockContainers[0]);
            });

            it("should find container by both image and label", async () => {
                const mockContainers = [
                    { Id: "abc123", Image: "nginx:latest", Labels: { "app": "web" }, Names: ["/test"], State: "running", Status: "Up" },
                    { Id: "def456", Image: "nginx:latest", Labels: { "app": "cache" }, Names: ["/test2"], State: "running", Status: "Up" }
                ];
                vi.mocked(PortainerApi.instance.getContainers).mockResolvedValue(mockContainers);

                const result = await utils.getContainerByDetails({ image: "nginx:latest", label: "app" });

                expect(result).toEqual(mockContainers[0]);
            });

            it("should return null when no container matches", async () => {
                const mockContainers = [
                    { Id: "abc123", Image: "nginx:latest", Labels: {}, Names: ["/test"], State: "running", Status: "Up" }
                ];
                vi.mocked(PortainerApi.instance.getContainers).mockResolvedValue(mockContainers);

                const result = await utils.getContainerByDetails({ image: "redis:latest" });

                expect(result).toBe(null);
            });

            it("should return null when getContainers returns undefined", async () => {
                vi.mocked(PortainerApi.instance.getContainers).mockResolvedValue(undefined);

                const result = await utils.getContainerByDetails({ image: "nginx:latest" });

                expect(result).toBe(null);
            });

            it("should handle errors gracefully", async () => {
                vi.mocked(PortainerApi.instance.getContainers).mockRejectedValue(new Error("API Error"));

                const result = await utils.getContainerByDetails({ image: "nginx:latest" });

                expect(result).toBe(null);
            });
        });
    });

    describe("getStackByName()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid stackName types", async () => {
                const result1 = await utils.getStackByName(null as any);
                const result2 = await utils.getStackByName(undefined as any);
                const result3 = await utils.getStackByName(123 as any);
                const result4 = await utils.getStackByName("" as any);

                expect(result1).toBe(null);
                expect(result2).toBe(null);
                expect(result3).toBe(null);
                expect(result4).toBe(null);
            });
        });

        describe("Stack Search", () => {
            it("should find stack by name", async () => {
                const mockStacks = [
                    { Id: 1, Name: "test-stack", EndpointId: 1 },
                    { Id: 2, Name: "other-stack", EndpointId: 1 }
                ];
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(mockStacks);

                const result = await utils.getStackByName("test-stack");

                expect(result).toEqual(mockStacks[0]);
            });

            it("should return null when stack is not found", async () => {
                const mockStacks = [
                    { Id: 1, Name: "test-stack", EndpointId: 1 }
                ];
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(mockStacks);

                const result = await utils.getStackByName("nonexistent-stack");

                expect(result).toBe(null);
            });

            it("should return null when getStacks returns undefined", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(undefined);

                const result = await utils.getStackByName("test-stack");

                expect(result).toBe(null);
            });

            it("should handle errors gracefully", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockRejectedValue(new Error("API Error"));

                const result = await utils.getStackByName("test-stack");

                expect(result).toBe(null);
            });
        });
    });

    describe("getStackById()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid stackid types", async () => {
                const result1 = await utils.getStackById(null as any, 1);
                const result2 = await utils.getStackById(undefined as any, 1);
                const result3 = await utils.getStackById("invalid" as any, 1);
                const result4 = await utils.getStackById(NaN, 1);
                const result5 = await utils.getStackById(-5, 1);
                const result6 = await utils.getStackById(0, 1);

                expect(result1).toBe(null);
                expect(result2).toBe(null);
                expect(result3).toBe(null);
                expect(result4).toBe(null);
                expect(result5).toBe(null);
                expect(result6).toBe(null);
            });

            it("should reject invalid environmentId types", async () => {
                const result1 = await utils.getStackById(1, null as any);
                const result2 = await utils.getStackById(1, undefined as any);
                const result3 = await utils.getStackById(1, "invalid" as any);
                const result4 = await utils.getStackById(1, NaN);
                const result5 = await utils.getStackById(1, -5);
                const result6 = await utils.getStackById(1, 0);

                expect(result1).toBe(null);
                expect(result2).toBe(null);
                expect(result3).toBe(null);
                expect(result4).toBe(null);
                expect(result5).toBe(null);
                expect(result6).toBe(null);
            });
        });

        describe("Stack Search", () => {
            it("should find stack by id and environment", async () => {
                const mockStacks = [
                    { Id: 1, Name: "test-stack", EndpointId: 1 },
                    { Id: 2, Name: "other-stack", EndpointId: 1 },
                    { Id: 1, Name: "test-stack", EndpointId: 2 }
                ];
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(mockStacks);

                const result = await utils.getStackById(1, 1);

                expect(result).toEqual(mockStacks[0]);
            });

            it("should return null when stack with matching id but different environment exists", async () => {
                const mockStacks = [
                    { Id: 1, Name: "test-stack", EndpointId: 2 }
                ];
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(mockStacks);

                const result = await utils.getStackById(1, 1);

                expect(result).toBe(null);
            });

            it("should return null when stack is not found", async () => {
                const mockStacks = [
                    { Id: 1, Name: "test-stack", EndpointId: 1 }
                ];
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(mockStacks);

                const result = await utils.getStackById(99, 1);

                expect(result).toBe(null);
            });

            it("should return null when getStacks returns undefined", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue(undefined);

                const result = await utils.getStackById(1, 1);

                expect(result).toBe(null);
            });

            it("should handle errors gracefully", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockRejectedValue(new Error("API Error"));

                const result = await utils.getStackById(1, 1);

                expect(result).toBe(null);
            });
        });
    });

    describe("verifyStackCreation()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid stackName types", async () => {
                const result1 = await utils.verifyStackCreation(null as any);
                const result2 = await utils.verifyStackCreation(undefined as any);
                const result3 = await utils.verifyStackCreation(123 as any);
                const result4 = await utils.verifyStackCreation("");

                expect(result1).toBe(false);
                expect(result2).toBe(false);
                expect(result3).toBe(false);
                expect(result4).toBe(false);
            });

            it("should handle missing timeoutMs parameter", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue([
                    { Id: 1, Name: "test-stack", EndpointId: 1 }
                ]);

                const result = await utils.verifyStackCreation("test-stack", undefined as any);

                expect(result).toBe(true);
            });

            it("should handle null timeoutMs parameter", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue([
                    { Id: 1, Name: "test-stack", EndpointId: 1 }
                ]);

                const result = await utils.verifyStackCreation("test-stack", null as any);

                expect(result).toBe(true);
            });

            it("should handle invalid timeoutMs types", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue([
                    { Id: 1, Name: "test-stack", EndpointId: 1 }
                ]);

                const result1 = await utils.verifyStackCreation("test-stack", "invalid" as any);
                const result2 = await utils.verifyStackCreation("test-stack", NaN);
                const result3 = await utils.verifyStackCreation("test-stack", -5);

                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(result3).toBe(true);
            });
        });

        describe("Stack Verification", () => {
            it("should return true when stack is found immediately", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue([
                    { Id: 1, Name: "test-stack", EndpointId: 1 }
                ]);

                const result = await utils.verifyStackCreation("test-stack", 5000);

                expect(result).toBe(true);
            });

            it("should retry and return true when stack is found after retries", async () => {
                vi.mocked(PortainerApi.instance.getStacks)
                    .mockResolvedValueOnce([])
                    .mockResolvedValueOnce([])
                    .mockResolvedValueOnce([{ Id: 1, Name: "test-stack", EndpointId: 1 }]);

                const promise = utils.verifyStackCreation("test-stack", 5000);
                
                await vi.advanceTimersByTimeAsync(2000);
                
                const result = await promise;

                expect(result).toBe(true);
            });

            it("should return false when timeout is reached", async () => {
                vi.mocked(PortainerApi.instance.getStacks).mockResolvedValue([]);

                const promise = utils.verifyStackCreation("test-stack", 2000);
                
                await vi.advanceTimersByTimeAsync(2000);
                
                const result = await promise;

                expect(result).toBe(false);
            });

            it("should handle errors during verification and continue retrying", async () => {
                vi.mocked(PortainerApi.instance.getStacks)
                    .mockRejectedValueOnce(new Error("API Error"))
                    .mockResolvedValueOnce([{ Id: 1, Name: "test-stack", EndpointId: 1 }]);

                const promise = utils.verifyStackCreation("test-stack", 5000);
                
                await vi.advanceTimersByTimeAsync(1000);
                
                const result = await promise;

                expect(result).toBe(true);
            });
        });
    });

    describe("verifyContainerCreation()", () => {
        describe("Parameter Validation", () => {
            it("should reject invalid containerName types", async () => {
                const result1 = await utils.verifyContainerCreation(null as any);
                const result2 = await utils.verifyContainerCreation(undefined as any);
                const result3 = await utils.verifyContainerCreation(123 as any);
                const result4 = await utils.verifyContainerCreation("");

                expect(result1).toBe(false);
                expect(result2).toBe(false);
                expect(result3).toBe(false);
                expect(result4).toBe(false);
            });

            it("should handle missing timeoutMs parameter", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                mockGetInstance.mockReturnValue({
                    getContainerDetails: vi.fn().mockResolvedValue({
                        Id: "abc123",
                        Names: ["/test-container"],
                        State: "running"
                    })
                } as any);

                const result = await utils.verifyContainerCreation("test-container", undefined as any);

                expect(result).toBe(true);
            });

            it("should handle null timeoutMs parameter", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                mockGetInstance.mockReturnValue({
                    getContainerDetails: vi.fn().mockResolvedValue({
                        Id: "abc123",
                        Names: ["/test-container"],
                        State: "running"
                    })
                } as any);

                const result = await utils.verifyContainerCreation("test-container", null as any);

                expect(result).toBe(true);
            });

            it("should handle invalid timeoutMs types", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                mockGetInstance.mockReturnValue({
                    getContainerDetails: vi.fn().mockResolvedValue({
                        Id: "abc123",
                        Names: ["/test-container"],
                        State: "running"
                    })
                } as any);

                const result1 = await utils.verifyContainerCreation("test-container", "invalid" as any);
                const result2 = await utils.verifyContainerCreation("test-container", NaN);
                const result3 = await utils.verifyContainerCreation("test-container", -5);

                expect(result1).toBe(true);
                expect(result2).toBe(true);
                expect(result3).toBe(true);
            });
        });

        describe("Container Verification", () => {
            it("should return true when container is found immediately", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                mockGetInstance.mockReturnValue({
                    getContainerDetails: vi.fn().mockResolvedValue({
                        Id: "abc123",
                        Names: ["/test-container"],
                        State: "running"
                    })
                } as any);

                const result = await utils.verifyContainerCreation("test-container", 5000);

                expect(result).toBe(true);
            });

            it("should retry and return true when container is found after retries", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                const mockGetContainerDetails = vi.fn()
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce(undefined)
                    .mockResolvedValueOnce({
                        Id: "abc123",
                        Names: ["/test-container"],
                        State: "running"
                    });
                
                mockGetInstance.mockReturnValue({
                    getContainerDetails: mockGetContainerDetails
                } as any);

                const promise = utils.verifyContainerCreation("test-container", 5000);
                
                await vi.advanceTimersByTimeAsync(2000);
                
                const result = await promise;

                expect(result).toBe(true);
            });

            it("should return false when timeout is reached", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                mockGetInstance.mockReturnValue({
                    getContainerDetails: vi.fn().mockResolvedValue(undefined)
                } as any);

                const promise = utils.verifyContainerCreation("test-container", 2000);
                
                await vi.advanceTimersByTimeAsync(2000);
                
                const result = await promise;

                expect(result).toBe(false);
            });

            it("should handle errors during verification and continue retrying", async () => {
                const mockGetInstance = vi.mocked(PortainerApi.getInstance);
                const mockGetContainerDetails = vi.fn()
                    .mockRejectedValueOnce(new Error("API Error"))
                    .mockResolvedValueOnce({
                        Id: "abc123",
                        Names: ["/test-container"],
                        State: "running"
                    });
                
                mockGetInstance.mockReturnValue({
                    getContainerDetails: mockGetContainerDetails
                } as any);

                const promise = utils.verifyContainerCreation("test-container", 5000);
                
                await vi.advanceTimersByTimeAsync(1000);
                
                const result = await promise;

                expect(result).toBe(true);
            });
        });
    });
});
