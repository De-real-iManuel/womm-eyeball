"use client";
import { useState } from "react";

export default function Newsletter() {
  const [done, setDone] = useState(false);
  // PLANTED: the button is never disabled while the request runs, so a double click sends two POSTs.
  // (This form does give feedback and validates with required/type=email.)
  async function subscribe(e) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    setDone(true);
  }
  return (
    <>
      <title>Acme: Newsletter</title>
      <h1>Newsletter</h1>
      <form onSubmit={subscribe}>
        <label htmlFor="n-email">Email</label>
        <input id="n-email" name="email" type="email" required />
        <p><button type="submit">Subscribe</button></p>
      </form>
      {done && <p role="status">Thanks, you are subscribed.</p>}
    </>
  );
}
