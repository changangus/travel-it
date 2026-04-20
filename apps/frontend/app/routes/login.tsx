import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { commitSession, getSession } from "../services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (session.has("token")) {
    return redirect("/");
  }
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  const baseUrl = process.env.API_BASE_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { errors: data.errors || { form: "Invalid credentials" } },
        { status: 400 }
      );
    }

    const session = await getSession(request.headers.get("Cookie"));
    session.set("token", data.token);

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    return Response.json(
      { errors: { form: "Could not connect to the authentication server" } },
      { status: 500 }
    );
  }
}

export default function LoginPage() {
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
      
      <Form method="post" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Email</label>
          <input 
            type="email" 
            name="email" 
            required 
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          {actionData?.errors?.email && (
            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {actionData.errors.email[0]}
            </p>
          )}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Password</label>
          <input 
            type="password" 
            name="password" 
            required 
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
          />
          {actionData?.errors?.password && (
            <p style={{ color: "red", fontSize: "0.8rem", marginTop: "0.25rem" }}>
              {actionData.errors.password[0]}
            </p>
          )}
        </div>

        {actionData?.errors?.form && (
          <p style={{ color: "red", textAlign: "center" }}>{actionData.errors.form}</p>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ 
            padding: "0.75rem", 
            backgroundColor: "#007bff", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            fontWeight: "bold",
            marginTop: "1rem"
          }}
        >
          {isSubmitting ? "Logging in..." : "Sign In"}
        </button>
      </Form>
      
      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <Link to="/" style={{ color: "#666", textDecoration: "none", fontSize: "0.9rem" }}>
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
