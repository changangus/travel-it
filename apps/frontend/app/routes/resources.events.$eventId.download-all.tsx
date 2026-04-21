import type { LoaderFunctionArgs } from "@remix-run/node";
import { getSession } from "../services/session.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  const apiBase = process.env.API_BASE_URL;

  const response = await fetch(
    `${apiBase}/api/events/${params.eventId}/media/download-all`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    throw new Response("Failed to download media", { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        response.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
