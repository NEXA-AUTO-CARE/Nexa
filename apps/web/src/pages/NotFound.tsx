import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="mb-4 font-heading text-5xl font-bold text-gradient">404</h1>
        <p className="mb-6 text-base text-muted-foreground">Oops! That page doesn't exist.</p>
        <Link to="/" className="text-primary font-medium underline hover:text-primary/90">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
