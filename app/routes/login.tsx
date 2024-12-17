import { Header } from '~/components/header/Header';
import { useCallback, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from "@remix-run/react";
import { getAccountClient } from '~/lib/appwrite';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export default function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('')

  const navigate = useNavigate();
  const location = useLocation();

  const signIn = useCallback(async () => {
    try {
      const session = await getAccountClient().createEmailPasswordSession(
        email,
        password
      );
      console.log(session);
      const searchParams = new URLSearchParams(location.search);
      const redirectUri = searchParams.get("redirectUri");
      if (redirectUri) {
        navigate(redirectUri);
      } else {
        navigate('/');
      }
    } catch (error) {
      setLoginError((error as Error).message)
    }
  }, [email, password]);

  useEffect(() => {
    if (loginError) {
      toast(loginError, {type: 'error'})
    }
  }, [loginError])

  useEffect(() => {
    setLoginError('');
  }, [email, password])

  const checkIfUserIsLoggedIn = async () => {
    try {
      const user = await getAccountClient().get();
      console.log("logged in user: ", user);
      navigate('/');
    } catch (err) {
      console.log("user not logged in", err);
    }
  }

  useEffect(() => {
    checkIfUserIsLoggedIn();
  }, [])




  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <Header />
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center text-bolt-elements-textPrimary">
          <span className="i-bolt:logo-text?mask w-[46px] inline-block" />
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight">Sign in to your account</h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form className="space-y-6" onSubmit={(event) => {
            event.preventDefault();
            signIn()
          }}>
            <div>
              <label htmlFor="email" className="block text-sm/6 font-medium text-bolt-elements-textPrimary">Email address</label>
              <div className="mt-2">
                <input
                  onChange={(event) => setEmail(event.target.value)}
                  value={email}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-bolt-elements-textPrimary">Password</label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  onChange={(event) => setPassword(event.target.value)}
                  value={password}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
                />
              </div>
            </div>

            <div>
              <button type="submit" className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Sign in</button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm/6 text-gray-500">
            Not a member?
            <Link className="font-semibold text-indigo-600 hover:text-indigo-500 ml-2" to="/register">Start a 14 day free trial</Link>
          </p>
        </div>
      </div>
      {
        loginError && <ToastContainer
          closeButton={({ closeToast }) => {
            return (
              <button className="Toastify__close-button" onClick={closeToast}>
                <div className="i-ph:x text-lg" />
              </button>
            );
          }}
          icon={({ type }) => {
            /**
             * @todo Handle more types if we need them. This may require extra color palettes.
             */
            switch (type) {
              case 'success': {
                return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
              }
              case 'error': {
                return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
              }
            }

            return undefined;
          }}
          position="bottom-right"
          pauseOnFocusLoss
          transition={toastAnimation}
        />
      }
    </div>
  );
}
