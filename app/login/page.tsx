import { login, signInWithEmail } from './actions';

export default function LoginPage() {
  return (
    <>
      <form
        className="flex flex-col space-y-4 p-8 max-w-sm mx-auto border rounded-lg shadow-md"
        action={signInWithEmail}
      >
        <h1 className="text-2xl font-semibold">
          Campus Rallyes verwalten
        </h1>
        <label htmlFor="email" className="font-semibold">
          E-Mail:
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Anmeldelink per E-Mail senden
        </button>
      </form>
      <form
        className="flex flex-col space-y-4 p-8 max-w-sm mx-auto my-20 border rounded-lg shadow-md"
        action={login}
      >
        <h1 className="text-2xl font-semibold">
          Administrator-Login
        </h1>
        <label htmlFor="email" className="font-semibold">
          E-Mail:
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="p-2 border rounded"
        />
        <label htmlFor="password" className="font-semibold">
          Passwort:
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="p-2 border rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Anmelden
        </button>
      </form>
    </>
  );
}
