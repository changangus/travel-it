import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation, useLoaderData, Link } from "@remix-run/react";
import { commitSession, getSession } from "../services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("token")) {
    return redirect("/");
  }
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  return {
    error: error === "unauthorized" ? "You are not authorized to access this app." : null,
  };
}

const GOOGLE_AUTH_COOLDOWN_MS = 15_000;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const baseUrl = process.env.API_BASE_URL || "http://localhost:8000";

  if (intent === "google") {
    const session = await getSession(request.headers.get("Cookie"));
    const lastAttempt = session.get("googleAuthAttemptAt") as number | undefined;
    const now = Date.now();

    if (lastAttempt && now - lastAttempt < GOOGLE_AUTH_COOLDOWN_MS) {
      const secondsLeft = Math.ceil((GOOGLE_AUTH_COOLDOWN_MS - (now - lastAttempt)) / 1000);
      return Response.json(
        { errors: { google: `Please wait ${secondsLeft}s before trying again.` } },
        { status: 429, headers: { "Set-Cookie": await commitSession(session) } }
      );
    }

    session.set("googleAuthAttemptAt", now);
    return redirect(`${baseUrl}/api/auth/google`, {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }

  return Response.json({ errors: { form: "Invalid request" } }, { status: 400 });
}

export default function LoginPage() {
  const { error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ 
      fontFamily: "system-ui, sans-serif", 
      maxWidth: "400px", 
      margin: "100px auto", 
      padding: "2rem",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>Login</h1>
      
      {error && (
        <p style={{ color: "red", textAlign: "center", marginBottom: "1rem" }}>{error}</p>
      )}

      <Form method="post">
          <input type="hidden" name="intent" value="google" />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              color: "#333",
              fontWeight: "bold",
              backgroundColor: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            Sign in with Google
          </button>
          {actionData?.errors?.google && (
            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.5rem", textAlign: "center" }}>
              {actionData.errors.google}
            </p>
          )}
      </Form>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Link to="/" style={{ color: "#666", textDecoration: "none", fontSize: "0.9rem" }}>
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
