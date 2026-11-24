"use client";
export default function Contact() {
  // PLANTED: no validation (no required, no type=email, nothing checked) and
  // PLANTED: no success or error feedback; the response is thrown away.
  async function send(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }).catch(() => {});
  }
  return (
    <>
      <title>Acme: Contact</title>
      <h1>Contact us</h1>
      <form onSubmit={send}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" />
        <label htmlFor="msg">Message</label>
        <textarea id="msg" name="message" rows={4} />
        <p><button type="submit">Send</button></p>
      </form>
    </>
  );
}
