import Link from 'next/link';
import StorefrontLayout from './(storefront)/layout';

export default function NotFound() {
  return (
    <StorefrontLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-primary mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h2 className="text-4xl font-bold mb-4">404 - Page Not Found</h2>
        <p className="text-xl text-base-content/70 mb-8">
          The page is not ready yet, please visit after some time.
        </p>
        <Link href="/" className="btn btn-primary btn-wide rounded-full">
          Return Home
        </Link>
      </div>
    </StorefrontLayout>
  );
}
