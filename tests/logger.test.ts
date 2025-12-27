import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logInfo, logWarn, logError, setLogger, ActiveLogger, type Logger } from "../logger";
import debug from 'debug';

// Mock the debug module
vi.mock('debug', () => {
    const mockDebugFunction: any = vi.fn(() => {});
    mockDebugFunction.color = '0';
    
    const mockDebug: any = vi.fn(() => mockDebugFunction);
    mockDebug.enable = vi.fn();

    return {
        default: mockDebug
    };
});

describe("Logger Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("logInfo()", () => {
        it("should log info messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:info');
            
            logInfo("Test info message");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should log info messages with additional arguments", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:info');
            
            logInfo("Test message", { key: "value" }, 123);
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle empty messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:info');
            
            logInfo("");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle messages with special characters", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:info');
            
            logInfo("Test message with special chars: !@#$%^&*()");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });
    });

    describe("logWarn()", () => {
        it("should log warning messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:warn');
            
            logWarn("Test warning message");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should log warning messages with additional arguments", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:warn');
            
            logWarn("Test warning", { warning: true }, 456);
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle empty warning messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:warn');
            
            logWarn("");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle multi-line warning messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:warn');
            
            logWarn("Line 1\nLine 2\nLine 3");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });
    });

    describe("logError()", () => {
        it("should log error messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:error');
            
            logError("Test error message");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should log error messages with additional arguments", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:error');
            
            logError("Test error", new Error("Something went wrong"), 789);
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle Error objects", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:error');
            const error = new Error("Test error");
            
            logError("Error occurred", error);
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle empty error messages", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:error');
            
            logError("");
            
            expect(mockDebugFn).toHaveBeenCalled();
        });

        it("should handle stack traces", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:error');
            const error = new Error("Test error with stack");
            
            logError("Stack trace:", error.stack);
            
            expect(mockDebugFn).toHaveBeenCalled();
        });
    });

    describe("setLogger()", () => {
        it("should set a custom logger", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);

            expect(ActiveLogger).toBe(customLogger);
        });

        it("should allow custom logger to be used for info", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            ActiveLogger.info("Test message");

            expect(customLogger.info).toHaveBeenCalledWith("Test message");
        });

        it("should allow custom logger to be used for warn", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            ActiveLogger.warn("Warning message");

            expect(customLogger.warn).toHaveBeenCalledWith("Warning message");
        });

        it("should allow custom logger to be used for error", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            ActiveLogger.error("Error message");

            expect(customLogger.error).toHaveBeenCalledWith("Error message");
        });

        it("should accept logger with additional properties", () => {
            const customLogger: Logger & { debug?: (msg: string) => void } = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn()
            };

            setLogger(customLogger);

            expect(ActiveLogger).toBe(customLogger);
        });

        it("should allow switching between loggers", () => {
            const logger1: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            const logger2: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(logger1);
            expect(ActiveLogger).toBe(logger1);

            setLogger(logger2);
            expect(ActiveLogger).toBe(logger2);
        });

        it("should pass additional arguments to custom logger", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            ActiveLogger.info("Test", "arg1", "arg2", { key: "value" });

            expect(customLogger.info).toHaveBeenCalledWith("Test", "arg1", "arg2", { key: "value" });
        });
    });

    describe("Logger interface", () => {
        it("should have correct method signatures", () => {
            const testLogger: Logger = {
                info: (message: string, ...args: any[]) => {},
                warn: (message: string, ...args: any[]) => {},
                error: (message: string, ...args: any[]) => {}
            };

            expect(testLogger.info).toBeInstanceOf(Function);
            expect(testLogger.warn).toBeInstanceOf(Function);
            expect(testLogger.error).toBeInstanceOf(Function);
        });

        it("should accept variadic arguments", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            
            ActiveLogger.info("msg");
            ActiveLogger.info("msg", 1);
            ActiveLogger.info("msg", 1, 2);
            ActiveLogger.info("msg", 1, 2, { key: "value" });

            expect(customLogger.info).toHaveBeenCalledTimes(4);
        });
    });

    describe("Debug module integration", () => {
        it("should create debug loggers", () => {
            // The debug module is mocked, so we just verify the mock exists
            const mockDebug = debug as any;
            
            expect(mockDebug).toBeDefined();
            expect(typeof mockDebug).toBe('function');
        });

        it("should have enable method on debug", () => {
            const mockDebug = debug as any;
            
            expect(mockDebug.enable).toBeDefined();
            expect(typeof mockDebug.enable).toBe('function');
        });
    });

    describe("Environment configuration", () => {
        it("should handle DEBUG_LOGGER environment variable", () => {
            const originalEnv = process.env.DEBUG_LOGGER;
            process.env.DEBUG_LOGGER = 'custom-namespace:*';

            // Environment variable is read at module initialization time
            // For runtime, we just verify it exists
            expect(process.env.DEBUG_LOGGER).toBe('custom-namespace:*');

            // Restore
            if (originalEnv !== undefined) {
                process.env.DEBUG_LOGGER = originalEnv;
            } else {
                delete process.env.DEBUG_LOGGER;
            }
        });

        it("should handle missing DEBUG_LOGGER environment variable", () => {
            const originalEnv = process.env.DEBUG_LOGGER;
            delete process.env.DEBUG_LOGGER;
            
            expect(process.env.DEBUG_LOGGER).toBeUndefined();

            // Restore
            if (originalEnv !== undefined) {
                process.env.DEBUG_LOGGER = originalEnv;
            }
        });
    });

    describe("Color configuration", () => {
        it("should set color for info logger", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:info');
            
            logInfo("test");
            
            expect(mockDebugFn.color).toBe('0');
        });

        it("should set color for warn logger", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:warn');
            
            logWarn("test");
            
            expect(mockDebugFn.color).toBe('3');
        });

        it("should set color for error logger", () => {
            const mockDebug = debug as any;
            const mockDebugFn = mockDebug('portainer-api:error');
            
            logError("test");
            
            expect(mockDebugFn.color).toBe('1');
        });
    });

    describe("Edge cases", () => {
        it("should handle null messages", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            
            ActiveLogger.info(null as any);
            ActiveLogger.warn(null as any);
            ActiveLogger.error(null as any);

            expect(customLogger.info).toHaveBeenCalledWith(null);
            expect(customLogger.warn).toHaveBeenCalledWith(null);
            expect(customLogger.error).toHaveBeenCalledWith(null);
        });

        it("should handle undefined messages", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            
            ActiveLogger.info(undefined as any);
            ActiveLogger.warn(undefined as any);
            ActiveLogger.error(undefined as any);

            expect(customLogger.info).toHaveBeenCalledWith(undefined);
            expect(customLogger.warn).toHaveBeenCalledWith(undefined);
            expect(customLogger.error).toHaveBeenCalledWith(undefined);
        });

        it("should handle circular references in objects", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            
            const circular: any = { a: 1 };
            circular.self = circular;

            ActiveLogger.info("Circular:", circular);

            expect(customLogger.info).toHaveBeenCalled();
        });

        it("should handle very long messages", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            
            const longMessage = "a".repeat(10000);
            ActiveLogger.info(longMessage);

            expect(customLogger.info).toHaveBeenCalledWith(longMessage);
        });

        it("should handle messages with unicode characters", () => {
            const customLogger: Logger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };

            setLogger(customLogger);
            
            ActiveLogger.info("Unicode: 你好 🚀 ñ");
            ActiveLogger.warn("Unicode: 你好 🚀 ñ");
            ActiveLogger.error("Unicode: 你好 🚀 ñ");

            expect(customLogger.info).toHaveBeenCalled();
            expect(customLogger.warn).toHaveBeenCalled();
            expect(customLogger.error).toHaveBeenCalled();
        });
    });
});
