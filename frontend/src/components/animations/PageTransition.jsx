import { motion } from 'framer-motion';
import { fadeUp } from '../../lib/motion';

export default function PageTransition({ children }) {
  return (
    <motion.div {...fadeUp} style={{ height: '100%' }}>
      {children}
    </motion.div>
  );
}
