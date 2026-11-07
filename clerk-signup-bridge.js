import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useClerk, useSignUp } from "https://esm.sh/@clerk/react@6.18.6?external=react,react-dom";
import { ui } from "https://esm.sh/@clerk/ui@1.38.1?external=react,react-dom";

const PUBLISHABLE_KEY =
  document.querySelector("script[data-clerk-publishable-key]")?.dataset.clerkPublishableKey || "";

function toClerkError(error) {
  const normalized = new Error(error?.longMessage || error?.message || "Clerk sign-up failed.");
  normalized.code = error?.code || "";
  normalized.errors = [{
    code: error?.code || "",
    message: error?.message || "",
    longMessage: error?.longMessage || ""
  }];
  return normalized;
}

function throwIfError(result) {
  if (result?.error) throw toClerkError(result.error);
}

function readSignUp(signUp) {
  return {
    status: signUp.status,
    createdSessionId: signUp.createdSessionId,
    missingFields: Array.isArray(signUp.missingFields) ? [...signUp.missingFields] : [],
    protectCheck: signUp.protectCheck || null
  };
}

function SignUpBridge({ onReady }) {
  const clerkInstance = useClerk();
  const { signUp } = useSignUp();
  const signUpRef = useRef(signUp);
  signUpRef.current = signUp;

  useEffect(() => {
    if (!clerkInstance?.loaded) return;

    const current = () => {
      if (!signUpRef.current) throw new Error("Clerk sign-up is not ready.");
      return signUpRef.current;
    };

    onReady({
      create: async emailAddress => {
        const result = await current().create({ emailAddress });
        throwIfError(result);
        return readSignUp(current());
      },
      sendEmailCode: async () => {
        const result = await current().verifications.sendEmailCode();
        throwIfError(result);
        return readSignUp(current());
      },
      verifyEmailCode: async code => {
        const result = await current().verifications.verifyEmailCode({ code });
        throwIfError(result);
        return readSignUp(current());
      },
      finalize: async () => {
        const result = await current().finalize();
        throwIfError(result);
        return readSignUp(current());
      }
    });
  }, [clerkInstance?.loaded]);

  return null;
}

export function mountClerkSignupBridge(clerk) {
  if (!clerk || typeof clerk.load !== "function" || !PUBLISHABLE_KEY) {
    return Promise.reject(new Error("Clerk could not initialize the VN SHOP sign-up bridge."));
  }

  const host = document.createElement("div");
  host.hidden = true;
  host.setAttribute("aria-hidden", "true");
  host.dataset.vnClerkSignupBridge = "true";
  document.body.appendChild(host);

  const root = createRoot(host);

  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      root.unmount();
      host.remove();
      reject(error);
    };
    const timeout = window.setTimeout(() => {
      fail(new Error("Clerk sign-up is taking too long to initialize. Refresh the page and try again."));
    }, 30000);

    const onReady = bridge => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(bridge);
    };

    try {
      root.render(
        React.createElement(
          ClerkProvider,
          {
            publishableKey: PUBLISHABLE_KEY,
            Clerk: clerk,
            ui
          },
          React.createElement(SignUpBridge, { onReady })
        )
      );
    } catch (error) {
      fail(error);
    }
  });
}
