export default function LandingPage() {
  return (
    <main className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Willkommen zur Campus Rallye</h1>
      <p className="mb-6">Bitte loggen Sie sich ein, um fortzufahren.</p>
      <a
        href="/rallyes"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
      >
        Login mit DHBW-Account
      </a>
    </main>
  );
}
