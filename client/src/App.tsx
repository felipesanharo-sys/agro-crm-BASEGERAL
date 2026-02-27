import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Aceleracao from "./pages/Aceleracao";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import Convite from "./pages/Convite";
import Historico from "./pages/Historico";
import Home from "./pages/Home";
import Produtos from "./pages/Produtos";
import Upload from "./pages/Upload";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/upload" component={Upload} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/historico" component={Historico} />
      <Route path="/aceleracao" component={Aceleracao} />
      <Route path="/produtos" component={Produtos} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/convite/:token" component={Convite} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
