import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Nav from "./Nav";
import PresentationBar from "../workflow/PresentationBar";
import { pageTransition } from "../../lib/motion";

/**
 * Shared shell for every authenticated route: sticky Nav + animated route
 * transitions + the floating Presentation Mode bar. Each page owns its
 * own <main> content and renders its own <Footer> at the end (footer copy
 * differs per page, e.g. "COMMAND CENTER" vs "SIMULATE").
 */
export default function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <Nav />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageTransition}
          className="flex-1 flex flex-col"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <PresentationBar />
    </div>
  );
}
