import { PortainerAuth } from './auth.ts';
import { EnvironmentsMixin } from './mixins/EnvironmentMixins.ts';
import { ResourceFetchingMixin } from './mixins/ResourceFetchingMixin.ts';
import { ResourceDeletionMixin } from './mixins/ResourceDeletionMixin.ts';
import { ContainerControlsMixin } from './mixins/ContainerControlsMixin.ts';
import { StackControlsMixin } from './mixins/StackControlsMixin.ts';

class PortainerApiBase {
    auth: PortainerAuth;
    environmentId: number | null = null; // Environment ID, can be null on init but must be defined when used
    constructor(
        environmentId: number | null = null
    ) {
        this.environmentId = environmentId;
        this.auth = PortainerAuth.getInstance();
    }
}

const MixinStack = StackControlsMixin(
    ContainerControlsMixin(
        ResourceDeletionMixin(
            ResourceFetchingMixin(
                EnvironmentsMixin(
                    PortainerApiBase
                )
            )
        )
    )
)

// Maintain singleton instance
class PortainerApi extends MixinStack {
    public static instance: PortainerApi;
    private constructor(
        environmentId: number | null = null
    ) {
        super(environmentId);
    }
    public static getInstance(
        environmentId: number | null = null
    ): PortainerApi {
        if (!PortainerApi.instance) {
            PortainerApi.instance = new PortainerApi(environmentId);
        }
        return PortainerApi.instance;
    }
}
export { PortainerApi };