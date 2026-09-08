import { type ReactNode, useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useGetCurrentAccess } from "@workspace/api-client-react";
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Sessions from "@/pages/sessions";
import Stakeholders from "@/pages/stakeholders";
import EvidenceLog from "@/pages/evidence";
import Opportunities from "@/pages/opportunities";
import Strategy from "@/pages/strategy";
import UserAccess from "@/pages/user-access";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in the environment");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f97316",
    colorForeground: "#172033",
    colorMutedForeground: "#64748b",
    colorDanger: "#dc2626",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#172033",
    colorNeutral: "#dbe3ef",
    fontFamily: "Plus Jakarta Sans, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900",
    headerSubtitle: "text-slate-600",
    socialButtonsBlockButtonText: "text-slate-800",
    formFieldLabel: "text-slate-700",
    footerActionLink: "text-orange-600 hover:text-orange-700",
    footerActionText: "text-slate-600",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-orange-600",
    formFieldSuccessText: "text-emerald-700",
    alertText: "text-red-700",
    logoBox: "h-10",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border-slate-200 bg-white hover:bg-slate-50",
    formButtonPrimary: "bg-orange-500 hover:bg-orange-600 text-white",
    formFieldInput: "border-slate-200 bg-slate-50 text-slate-900",
    footerAction: "border-slate-200",
    dividerLine: "bg-slate-200",
    alert: "border-red-200 bg-red-50",
    otpCodeFieldInput: "border-slate-200 bg-slate-50 text-slate-900",
    formFieldRow: "text-slate-900",
    main: "bg-white",
  },
};

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function PublicHome() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="max-w-xl space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <span className="text-xl font-bold">Ó</span>
        </div>
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-accent">
            Internal workspace
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            Transport Discovery Copilot
          </h1>
          <p className="mt-4 leading-7 text-muted-foreground">
            Evidence-led discovery for the ÓRBITA program. Sign in with your
            individual team account to access the protected workspace.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          Sign in to continue
        </Link>
      </div>
    </main>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function LogoutButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: basePath || "/" })}
      className="text-xs font-medium text-sidebar-foreground/60 transition hover:text-sidebar-foreground"
    >
      Sign out
    </button>
  );
}

function AuthenticatedRouter() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return <div className="min-h-[100dvh] bg-background" />;
  }
  if (!isSignedIn) return <PublicHome />;

  return <SignedInWorkspace />;
}

function SignedInWorkspace() {
  const { data: access } = useGetCurrentAccess();

  return (
    <Layout
      signOut={<LogoutButton />}
      isAdministrator={access?.role === "administrator"}
    >
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/stakeholders" component={Stakeholders} />
          <Route path="/evidence" component={EvidenceLog} />
          <Route path="/opportunities" component={Opportunities} />
          <Route path="/strategy" component={Strategy} />
          <Route path="/users" component={UserAccess} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Layout>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;
  return isSignedIn ? <Redirect to="/sessions" /> : <PublicHome />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) {
        client.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access the ÓRBITA workspace",
          },
        },
        signUp: {
          start: {
            title: "Create your team account",
            subtitle: "Individual accounts are required for workspace access",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={AuthenticatedRouter} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default function AppWithProviders() {
  return (
    <TooltipProvider>
      <App />
      <Toaster />
    </TooltipProvider>
  );
}