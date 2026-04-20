import { Form, useActionData, useNavigation } from "@remix-run/react";
import styles from "./GoogleSignInButton.module.css";

export function GoogleSignInButton() {
  const navigation = useNavigation();
  const actionData = useActionData<{ errors?: { google?: string } }>();
  const isSubmitting = navigation.state === "submitting" && navigation.formData?.get("intent") === "google";

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="google" />
      <button
        type="submit"
        disabled={isSubmitting}
        className={styles.googleButton}
      >
        {isSubmitting ? "Signing in..." : "Sign in with Google"}
      </button>
      {actionData?.errors?.google && (
        <p className={styles.errorText}>
          {actionData.errors.google}
        </p>
      )}
    </Form>
  );
}
