const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src');

const directories = [
  'app/(storefront)/menu',
  'app/(storefront)/about',
  'app/(storefront)/contact',
  'app/(storefront)/booking',
  'app/(auth)/login',
  'app/(auth)/register',
  'app/(admin)/admin',
  'app/(admin)/admin/catalog',
  'app/(admin)/admin/hr',
  'app/(admin)/admin/inventory',
  'app/(admin)/admin/pos',
  'components/ui',
  'components/layout',
  'lib',
];

directories.forEach((dir) => {
  fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
});

// Create API Lib
const apiContent = `
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8029/api/v1';

export async function fetchApi(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }

  const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error('API Request Failed');
  }

  if (response.status === 204) return null;
  return response.json();
}
`;
fs.writeFileSync(path.join(baseDir, 'lib/api.ts'), apiContent);

// Create UI Components
const uiComponents = {
  'Button.tsx': `
import React from 'react';
import styles from './ui.module.css';

export const Button = ({ children, variant = 'primary', ...props }: any) => {
  return (
    <button className={\`\${styles.btn} \${styles[variant]}\`} {...props}>
      {children}
    </button>
  );
};
  `,
  'Input.tsx': `
import React from 'react';
import styles from './ui.module.css';

export const Input = ({ label, ...props }: any) => {
  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={styles.input} {...props} />
    </div>
  );
};
  `,
  'Card.tsx': `
import React from 'react';
import styles from './ui.module.css';

export const Card = ({ children, title }: any) => {
  return (
    <div className={styles.card}>
      {title && <div className={styles.cardHeader}>{title}</div>}
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
};
  `,
  'ui.module.css': `
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
}
.primary { background: var(--primary); color: #fff; }
.primary:hover { background: var(--primary-hover); }
.secondary { background: transparent; border: 2px solid var(--primary); color: var(--primary); }
.secondary:hover { background: rgba(217, 119, 6, 0.1); }
.danger { background: var(--danger); color: #fff; }

.inputGroup { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
.label { font-weight: 500; font-size: 0.9rem; color: var(--text-main); }
.input { padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-family: inherit; }
.input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1); }

.card { background: var(--surface); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #f3f4f6; }
.cardHeader { padding: 1rem 1.5rem; border-bottom: 1px solid #f3f4f6; font-weight: 600; font-size: 1.1rem; }
.cardBody { padding: 1.5rem; }
  `
};

Object.entries(uiComponents).forEach(([file, content]) => {
  fs.writeFileSync(path.join(baseDir, 'components/ui', file), content.trim());
});

// Create Admin Layout
const adminLayout = `
import React from 'react';
import styles from './layout.module.css';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.adminContainer}>
      <aside className={styles.sidebar}>
        <h2>RestoraERP Admin</h2>
        <nav className={styles.nav}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/pos">POS System</Link>
          <Link href="/admin/catalog">Catalog</Link>
          <Link href="/admin/hr">HR</Link>
          <Link href="/admin/inventory">Inventory</Link>
        </nav>
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
`;
fs.writeFileSync(path.join(baseDir, 'app/(admin)/layout.tsx'), adminLayout.trim());
fs.writeFileSync(path.join(baseDir, 'app/(admin)/layout.module.css'), `
.adminContainer { display: flex; min-height: 100vh; background: var(--background); }
.sidebar { width: 260px; background: var(--surface); border-right: 1px solid #e5e7eb; padding: 1.5rem; }
.sidebar h2 { color: var(--primary); margin-bottom: 2rem; font-size: 1.5rem; }
.nav { display: flex; flex-direction: column; gap: 0.5rem; }
.nav a { padding: 0.75rem 1rem; border-radius: 8px; color: var(--text-main); font-weight: 500; transition: all 0.2s; }
.nav a:hover { background: rgba(217, 119, 6, 0.1); color: var(--primary); }
.mainContent { flex: 1; padding: 2rem; overflow-y: auto; }
`.trim());

// Scaffold basic pages
const pages = {
  'app/(storefront)/menu/page.tsx': "export default function Menu() { return <div><h1>Menu</h1></div>; }",
  'app/(storefront)/about/page.tsx': "export default function About() { return <div><h1>About Us</h1></div>; }",
  'app/(storefront)/contact/page.tsx': "export default function Contact() { return <div><h1>Contact</h1></div>; }",
  'app/(storefront)/booking/page.tsx': "export default function Booking() { return <div><h1>Book a Table</h1></div>; }",
  'app/(auth)/login/page.tsx': "export default function Login() { return <div><h1>Login</h1></div>; }",
  'app/(admin)/admin/page.tsx': "export default function Dashboard() { return <div><h1>Dashboard Overview</h1></div>; }",
  'app/(admin)/admin/pos/page.tsx': "export default function POS() { return <div><h1>Point of Sale</h1></div>; }",
  'app/(admin)/admin/catalog/page.tsx': "export default function Catalog() { return <div><h1>Catalog Management</h1></div>; }",
  'app/(admin)/admin/hr/page.tsx': "export default function HR() { return <div><h1>Human Resources</h1></div>; }",
  'app/(admin)/admin/inventory/page.tsx': "export default function Inventory() { return <div><h1>Inventory</h1></div>; }",
};

Object.entries(pages).forEach(([file, content]) => {
  fs.writeFileSync(path.join(baseDir, file), content);
});

console.log('Frontend scaffolding completed.');
