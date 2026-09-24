import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AdminPasswordGateProps {
  children: React.ReactNode;
  storageKey?: string;
}

export const AdminPasswordGate = ({ 
  children, 
  storageKey = 'admin_feedback_auth' 
}: AdminPasswordGateProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored === 'authenticated') {
      setIsAuthenticated(true);
      setIsLoading(false);
    } else {
      navigate('/auth', { replace: true });
    }
  }, [storageKey, navigate]);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
