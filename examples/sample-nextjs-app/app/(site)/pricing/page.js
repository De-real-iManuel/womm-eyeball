export const metadata = { title: "Acme: Pricing" };

export default function Pricing() {
  return (
    <>
      <h1>Pricing</h1>
      {/* PLANTED: 900px fixed-width table overflows at mobile width */}
      <table className="plans">
        <thead><tr><th>Plan</th><th>Seats</th><th>Support</th><th>Price</th></tr></thead>
        <tbody>
          <tr><td>Free</td><td>1</td><td>Community</td><td>$0</td></tr>
          <tr><td>Team</td><td>10</td><td>Email</td><td>$29</td></tr>
          <tr><td>Business</td><td>100</td><td>Phone</td><td>$99</td></tr>
        </tbody>
      </table>
    </>
  );
}
