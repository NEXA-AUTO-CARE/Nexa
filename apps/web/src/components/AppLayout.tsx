import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useIdleTimeout } from "../hooks/useIdleTimeout";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "./BottomNav";

const AppLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useIdleTimeout({
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    warningMs: 60 * 1000, // 60 seconds warning
    onWarning: () => {
      toast({
        title: "Inactivity Warning ⚠️",
        description: "Your session will expire in 60 seconds due to inactivity. Move your mouse or touch the screen to stay logged in.",
        duration: 10000,
      });
    },
    onTimeout: async () => {
      await logout();
      toast({
        title: "Session Expired 🕒",
        description: "You have been logged out due to inactivity.",
        variant: "destructive",
      });
      navigate("/login");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
