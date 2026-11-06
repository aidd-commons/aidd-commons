import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// Custom Chinese section routes now exist. Preserve Starlight's localized links.
export const onRequest = defineRouteMiddleware(() => {});
