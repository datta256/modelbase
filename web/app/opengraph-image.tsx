import { ImageResponse } from 'next/og';

export const alt = 'ModelBase - Free 3D Model Library';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #18181b, #27272a)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: '80px',
            marginBottom: '20px',
          }}
        >
          🎨
        </div>
        <h1
          style={{
            fontSize: '60px',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          ModelBase
        </h1>
        <p
          style={{
            fontSize: '32px',
            color: '#a1a1aa',
            textAlign: 'center',
          }}
        >
          10,000+ Free 3D Models
        </p>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            marginTop: '40px',
          }}
        >
          <span
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '20px',
            }}
          >
            OBJ
          </span>
          <span
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '20px',
            }}
          >
            GLTF
          </span>
          <span
            style={{
              background: '#2563eb',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '20px',
            }}
          >
            Sketchfab
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
