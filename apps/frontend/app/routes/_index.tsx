import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from '@remix-run/node';
import { useLoaderData, Link, Form } from '@remix-run/react';
import { useState } from 'react';
import { getSession, destroySession } from '../services/session.server';
import NxWelcome from '../nx-welcome';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('token');

  let user = null;
  if (token) {
    try {
      const userRes = await fetch(`${baseUrl}/api/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (userRes.ok) {
        user = await userRes.json();
      }
    } catch (e) {
      // Token might be invalid or backend down
    }
  }

  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = res.ok ? await res.json() : { status: 'error' };
    return { health: data, baseUrl, user };
  } catch (e) {
    return {
      health: {
        status: 'offline',
        message: `Could not connect to backend at ${baseUrl}`,
      },
      baseUrl,
      user,
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get('Cookie'));
  return redirect('/login', {
    headers: {
      'Set-Cookie': await destroySession(session),
    },
  });
};

export default function Index() {
  const { health, baseUrl, user } = useLoaderData<typeof loader>();
  const [clientData, setClientData] = useState<any>(null);

  const testClientFetch = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      const data = await res.json();
      setClientData(data);
    } catch (e) {
      setClientData({ status: 'error', message: 'Client fetch failed' });
    }
  };

  return (
    <>
      <div>
        {/* Auth Bar */}
        <div style={{
          padding: '0.5rem 1rem',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          background: '#333',
          color: 'white'
        }}>
          {user ? (
            <>
              <span>Logged in as: <strong>{user.email}</strong></span>
              <Form method="post">
                <button type="submit" style={{
                  background: 'none',
                  border: '1px solid white',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>Logout</button>
              </Form>
            </>
          ) : (
            <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Login</Link>
          )}
        </div>

        {/* Server-side Status */}
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            backgroundColor: health.status === 'ok' ? '#ecfdf5' : '#fef2f2',
            color: health.status === 'ok' ? '#065f46' : '#991b1b',
            borderBottom: '1px solid currentColor',
          }}
        >
          <strong>Server-side Status (via {baseUrl}):</strong> {health.status}
          {health.status !== 'ok' && <span> — {health.message}</span>}
        </div>

        {/* Client-side Status Test */}
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            background: '#f9fafb',
          }}
        >
          <button
            onClick={testClientFetch}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            Test Client-side Fetch
          </button>
          {clientData && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Client Result:</strong> {JSON.stringify(clientData)}
            </div>
          )}
        </div>

        <NxWelcome title={'@org/frontend'} />
      </div>
    </>
  );
}
