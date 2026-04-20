import { useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import NxWelcome from '../nx-welcome';

export const loader = async () => {
  // Strategy A: Use the API_BASE_URL from .env for server-side calls
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

  try {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) throw new Error('Backend responded with error');
    const data = await res.json();
    return { health: data, baseUrl };
  } catch (e) {
    return {
      health: {
        status: 'offline',
        message: `Could not connect to backend at ${baseUrl}`,
      },
      baseUrl,
    };
  }
};

export default function Index() {
  const { health, baseUrl } = useLoaderData<typeof loader>();
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
