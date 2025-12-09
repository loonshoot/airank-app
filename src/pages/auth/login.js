import { useEffect, useState } from 'react';
import { getProviders, signIn, useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import isEmail from 'validator/lib/isEmail';
import Image from 'next/image';

import Meta from '@/components/Meta/index';
import { AuthLayout } from '@/layouts/index';
import { useTranslation } from "react-i18next";

const Login = () => {
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [socialProviders, setSocialProviders] = useState([]);
  const validate = isEmail(email);

  const handleEmailChange = (event) => setEmail(event.target.value);

  const signInWithEmail = async (event) => {
    event.preventDefault();
    setSubmittingState(true);
    const response = await signIn('email', { email, redirect: false });

    if (response.error === null) {
      setSentEmail(email);
      setEmailSent(true);
      setEmail('');
    } else {
      toast.error('Something went wrong. Please try again.');
    }

    setSubmittingState(false);
  };

  const signInWithSocial = (socialId) => {
    signIn(socialId);
  };

  const handleTryAgain = () => {
    setEmailSent(false);
    setSentEmail('');
  };

  useEffect(() => {
    (async () => {
      const socialProviders = [];
      const { email, ...providers } = await getProviders();

      for (const provider in providers) {
        socialProviders.push(providers[provider]);
      }

      setSocialProviders([...socialProviders]);
    })();
  }, []);

  return (
    <AuthLayout>
      <Meta
        title="Login to AI Rank | Sign In"
        description="Login to your AI Rank account to access your AI visibility dashboard."
      />
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left side - Marketing (using divs/spans to avoid SEO weight) */}
        <div className="flex flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16 xl:px-24 bg-black">
          <div className="max-w-xl mx-auto lg:mx-0">
            <Image
              src="/images/logo-light.svg"
              alt="AI Rank logo"
              width={120}
              height={45}
              className="mb-8"
            />
            <div className="text-3xl font-bold text-white lg:text-4xl xl:text-5xl leading-[1.2] tracking-tight">
              Track your AI visibility across every model
            </div>
            <div className="mt-4 text-lg text-gray-400">
              Monitor how AI models like ChatGPT, Claude, and Perplexity mention and recommend your brand.
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-green-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Real-time monitoring of AI model responses</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-green-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Track competitor mentions and rankings</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-green-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Actionable insights to improve AI visibility</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="flex flex-col items-center justify-center px-8 py-12 lg:w-1/2 lg:px-16 xl:px-24 bg-zinc-900/50 border-l border-zinc-800">
          <div className="w-full max-w-md">
            {!emailSent ? (
              <>
                <div className="mb-8">
                  <h1 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Login
                  </h1>
                  <div className="text-2xl font-bold text-white">
                    Get started with your email
                  </div>
                  <div className="mt-2 text-gray-400">
                    We'll send you a magic link to sign in — no password needed.
                  </div>
                </div>
                <form className="space-y-4" onSubmit={signInWithEmail}>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email address
                    </label>
                    <input
                      id="email"
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                      onChange={handleEmailChange}
                      placeholder="you@company.com"
                      type="email"
                      value={email}
                      autoComplete="email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'loading' || !validate || isSubmitting}
                    className="w-full px-8 py-3 bg-green-600 text-black font-semibold rounded-lg shadow-lg shadow-green-600/20 hover:bg-green-600/90 hover:shadow-green-600/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {status === 'loading'
                      ? t("login.message.checking.session")
                      : isSubmitting
                        ? 'Sending...'
                        : 'Continue with email'}
                  </button>
                </form>
                {socialProviders.length > 0 && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-zinc-900/50 text-gray-500">or continue with</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {socialProviders.map((provider, index) => (
                        <button
                          key={index}
                          className="w-full py-3 bg-zinc-950 text-white border border-zinc-800 rounded-lg hover:border-green-600/30 disabled:opacity-50 transition-all duration-300 font-medium"
                          disabled={status === 'loading'}
                          onClick={() => signInWithSocial(provider.id)}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="mt-8 text-center text-sm text-gray-500">
                  By continuing, you agree to our{' '}
                  <a href="/terms" className="text-green-500 hover:text-green-400 transition-colors">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-green-500 hover:text-green-400 transition-colors">Privacy Policy</a>
                </p>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-950/30 border border-green-800/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-2xl font-bold text-white mb-2">
                  Check your email
                </div>
                <p className="text-gray-400 mb-2">
                  We've sent a sign-in link to
                </p>
                <p className="text-white font-medium mb-6">
                  {sentEmail}
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  Click the link in your email to sign in. If you don't see it, check your spam folder.
                </p>
                <button
                  onClick={handleTryAgain}
                  className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors"
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
