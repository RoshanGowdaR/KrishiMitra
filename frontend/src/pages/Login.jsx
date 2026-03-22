import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RiLeafFill } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const startLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <div className="language-overlay">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="language-modal"
      >
        <div className="language-header">
          <RiLeafFill className="brand-icon" />
          <h1>KrishiMitra</h1>
          <p>Sign in to continue your farming workspace.</p>
        </div>

        <button type="button" className="primary-btn" onClick={startLogin}>
          Continue with Google
        </button>
      </motion.div>
    </div>
  );
}
