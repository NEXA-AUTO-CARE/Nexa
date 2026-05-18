import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { User, Mail, Phone, Car, CalendarDays, CreditCard, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const menuItems = [
  { icon: Car, label: "My Vehicles", path: "/garage" },
  { icon: CalendarDays, label: "Booking History", path: "/bookings" },
  { icon: CreditCard, label: "Manage Payments", path: "/payments" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.displayName ||
    "Your account";

  const handleSignOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Profile</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 flex items-center gap-4"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="font-heading font-bold text-lg">{fullName}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {user?.email && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" /> {user.email}
              </span>
            )}
            {user?.phoneNumber && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {user.phoneNumber}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card overflow-hidden"
      >
        {menuItems.map(({ icon: Icon, label, path }, i) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors ${
              i < menuItems.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </motion.div>

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-destructive hover:text-destructive"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
};

export default ProfilePage;
