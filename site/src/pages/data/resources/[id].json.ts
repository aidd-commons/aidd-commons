import resourceData from "../../../../public/data/resources.v1.json" with { type: "json" };
import type { Resource } from "../../../data/resource.js";

export function getStaticPaths() {
  return (resourceData as Resource[]).map((resource) => ({
    params: { id: resource.id },
    props: { resource },
  }));
}

export function GET({ props }: { props: { resource: Resource } }) {
  return new Response(JSON.stringify(props.resource), {
    headers: { "Content-Type": "application/json" },
  });
}
