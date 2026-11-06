import resourceData from "../../../public/data/resources.v1.json" with { type: "json" };
import type { Resource } from "../../data/resource.js";
import { buildAtlasIndex } from "../../lib/atlas-presentation.js";

export function GET() {
  return new Response(
    JSON.stringify(buildAtlasIndex(resourceData as Resource[])),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}
