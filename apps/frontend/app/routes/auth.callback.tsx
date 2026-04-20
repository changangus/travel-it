import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { commitSession, getSession } from "../services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  console.log("[auth/callback] token:", token);

  if (!token) {
    console.log("[auth/callback] no token, redirecting to /login");
    return redirect("/login");
  }

  const session = await getSession(request.headers.get("Cookie"));
  session.set("token", token);

  console.log("[auth/callback] session set, redirecting to /");
  return redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
