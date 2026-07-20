import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "./Button";

const MotionLink = motion(Link);

/** Button styled cross-page nav — same hover/tap motion as Button, renders a real <Link>. */
export default function LinkButton({ to, ...props }) {
  return <Button as={MotionLink} to={to} {...props} />;
}
