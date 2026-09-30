import { BrowserRouter as Router } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/routes";

function App() {
  return (
    <AppProviders>
      <LazyMotion features={domAnimation}>
        <Router>
          <AppRoutes />
        </Router>
      </LazyMotion>
    </AppProviders>
  );
}

export default App;
