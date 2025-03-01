'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { useFormState, useFormStatus } from 'react-dom';
import { login, signInWithEmail, signInWithKeycloak, exchangeCodeForToken } from './actions';
import { KEYCLOAK_CONFIG } from '@/lib/keycloak-config';
import { FormState } from '@/lib/types';

const LoginButton = ({
  label,
  disabled = false,
}: {
  label: string;
  disabled: boolean;
}) => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
    >
      {pending ? 'Wird gesendet…' : label}
    </button>
  );
};

const KeycloakLoginButton = ({
  label,
  disabled = false,
}: {
  label: string;
  disabled: boolean;
}) => {
  const handleClick = () => {
    const params = new URLSearchParams({
      client_id: KEYCLOAK_CONFIG.clientId,
      redirect_uri: KEYCLOAK_CONFIG.redirectUri,
      response_type: KEYCLOAK_CONFIG.responseType
    });
    window.location.href = `${KEYCLOAK_CONFIG.authUrl}?${params.toString()}`;
  };
  return (
    <button
      type="button"
      className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      disabled={disabled}
      onClick={handleClick}
    >
      {label}
    </button>
  );
};

function LoginWithEmailLink() {
  const [state, action] = useFormState<FormState, FormData>(signInWithEmail, null);
  return (
    <form
      className="flex flex-col space-y-4 p-8 max-w-sm mx-auto border rounded-lg shadow-md"
      action={action}
    >
      <p className="text-sm text-gray-500">
        Anmeldelinks sind derzeit nicht möglich.
      </p>
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
      <LoginButton
        label="Anmeldelink per E-Mail senden"
        disabled={true}
      />
    </form>
  );
}

function LoginWithEmailPassword() {
  const [state, action] = useFormState<FormState, FormData>(login, null);

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
      <LoginButton label="Anmelden" disabled={false}/>
    </form>
  );
}

function KeycloakLogin() {
  const [state, action] = useFormState(signInWithKeycloak, null);
  return (
    <form
      className="flex flex-col space-y-4 p-8 max-w-sm mx-auto my-20 border rounded-lg shadow-md"
      action={action}
    >
      <h1 className="text-2xl font-semibold">Keycloak-Login</h1>
      <KeycloakLoginButton label="Mit Keycloak anmelden" disabled={false} />
    </form>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      // const code = searchParams.get('code');
      //     console.log('Extracted the code:', code);
      // if (code) {
      //   try {
      //     const tokenData = await exchangeCodeForToken(code);
      //     const decodedToken = jwtDecode(tokenData.access_token);
      //     console.log('Decoded token:', decodedToken);
      //     localStorage.setItem('keycloak_token', tokenData.access_token);
      //     localStorage.setItem('decoded_token', JSON.stringify(decodedToken));
      //     console.log('Token:', tokenData.access_token);
      //     router.push('/admin');
      //   } catch (error) {
      //     console.error('Error exchanging code for token:', error);
      //   }
      // }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <>
      <KeycloakLogin />
      <LoginWithEmailPassword />
      <LoginWithEmailLink />
    </>
  );
}
