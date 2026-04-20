import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { commitSession, getSession } from "../../services/session.server";
import { GOOGLE_AUTH_COOLDOWN_MS } from "./login.constants";
import { GoogleSignInButton } from "./components/GoogleSignInButton";
import styles from "./login.module.css";

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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Login</h1>
      
      {error && (
        <p className={styles.errorText}>{error}</p>
      )}

      <GoogleSignInButton />

      <div className={styles.footer}>
        <Link to="/" className={styles.footerLink}>
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
