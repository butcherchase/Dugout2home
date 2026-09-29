const messages: Record<string, string> = {
  invalid: "Check the form fields and try again.",
  credentials: "Email or password was not accepted.",
  register: "Could not create this account. If you already registered, sign in.",
  slow: "Too many attempts. Please wait 15 minutes and try again.",
  code: "That team code was not found. Ask your coach for the current code.",
  links: "Choose one roster player for a player account, or at least one for a parent. Coaches do not need player links.",
  stale: "This request changed or is no longer available. Refresh and try again.",
  saved: "Saved successfully."
};

export function FormMessage({ code }: { code?: string }) {
  return code && messages[code] ? <p role="status" className={code === "saved" ? "success" : "error"}>{messages[code]}</p> : null;
}
