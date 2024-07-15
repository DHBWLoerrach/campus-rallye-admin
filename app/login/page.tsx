'use client';

// TODO: in React 19, this will be just `useFormAction`
// https://react.dev/reference/react/useActionState
// https://react.dev/blog/2024/04/25/react-19#new-hook-useactionstate
import { useFormState, useFormStatus } from 'react-dom';
import { login, signInWithEmail } from './actions';

const LoginButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      aria-disabled={pending}
    >
      {pending ? 'Wird gesendet…' : label}
    </button>
  );
};

function LoginWithEmailLink() {
  const [state, action] = useFormState(signInWithEmail, null);
  return (
    <form
      className="flex flex-col space-y-4 p-8 max-w-sm mx-auto border rounded-lg shadow-md"
      action={action}
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
      {state?.errors && (
        <p className="text-sm text-red-500">{state.errors.message}</p>
      )}
      <LoginButton label="Anmeldelink per E-Mail senden" />
    </form>
  );
}

function LoginWithEmailPassword() {
  const [state, action] = useFormState(login, null);

  return (
    <form
      className="flex flex-col space-y-4 p-8 max-w-sm mx-auto my-20 border rounded-lg shadow-md"
      action={action}
    >
      <h1 className="text-2xl font-semibold">Administrator-Login</h1>
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
      {state?.errors && (
        <p className="text-sm text-red-500">{state.errors.message}</p>
      )}
      <LoginButton label="Anmelden" />
    </form>
  );
}
export default function LoginPage() {
  return (
    <>
      <LoginWithEmailLink />
      <LoginWithEmailPassword />
    </>
  );
}
