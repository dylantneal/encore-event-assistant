import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-extrabold text-gray-900">
            {statusCode}
          </h1>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {statusCode === 404 ? 'Page not found' : 'An error occurred'}
          </p>
          <p className="mt-2 text-base text-gray-600">
            {statusCode === 404
              ? 'Sorry, we couldn\'t find the page you\'re looking for.'
              : 'Sorry, something went wrong on our end.'}
          </p>
          <div className="mt-6">
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go back home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error; 