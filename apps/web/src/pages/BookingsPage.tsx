import { BookingStatus, type BookingResponse } from "@nexa/shared";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, ChevronRight, Gift } from "lucide-react";
import { useBookings } from "../hooks/useBookings";
import { mockGiftBookings } from "@/lib/mock";

const statusMeta: Record<BookingStatus, { label: string; color: string }> = {
  [BookingStatus.BOOKED]: { label: "Booked", color: "text-warning" },
  [BookingStatus.ACCEPTED]: { label: "Accepted", color: "text-info" },
  [BookingStatus.IN_PROGRESS]: { label: "In Progress", color: "text-warning" },
  [BookingStatus.COMPLETED]: { label: "Completed", color: "text-success" },
  [BookingStatus.CANCELLED]: { label: "Cancelled", color: "text-destructive" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const BookingsPage = () => {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">My Bookings</h1>

      {/* Personal Bookings */}
      <div className="space-y-3">
        <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Your Bookings</p>
        {isLoading ? (
          <div className="glass-card p-4 text-sm text-muted-foreground">Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <button
            onClick={() => navigate("/book")}
            className="glass-card w-full p-4 text-left text-sm text-muted-foreground"
          >
            No bookings yet — book your first wash.
          </button>
        ) : (
          bookings.map((b: BookingResponse, i) => {
            const meta = statusMeta[b.status];
            return (
              <motion.button
                key={b.bookingId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/bookings/status/${b.bookingId}`)}
                className="w-full glass-card p-4 flex items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Car className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.vehicleSummary}</p>
                  <p className="text-xs text-muted-foreground">
                    £{b.price} · {formatDate(b.bookingTime)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Gift Bookings — TODO(api): replace with real gift-bookings endpoint */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <p className="text-xs font-heading font-semibold text-primary uppercase tracking-wider">Gift Bookings</p>
        </div>
        {mockGiftBookings.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 space-y-2 border-primary/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{g.vehicle}</p>
                <p className="text-xs text-muted-foreground">{g.service} · {g.date}</p>
              </div>
              <span className={`text-xs font-medium ${g.statusColor}`}>{g.status}</span>
            </div>
            <div className="pl-[52px]">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">To:</span> {g.recipient}
              </p>
              <p className="text-xs text-muted-foreground truncate">{g.recipientEmail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BookingsPage;
