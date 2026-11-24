export const metadata = { title: "Acme: Home" };

export default function Home() {
  return (
    <>
      <h1>Welcome to Acme</h1>
      <p>We make small tools for small teams.</p>
      {/* PLANTED: low-contrast button */}
      <button className="ghost" type="button">Learn more</button>{" "}
      {/* PLANTED: dead control, no handler */}
      <button type="button">Get started</button>
    </>
  );
}
