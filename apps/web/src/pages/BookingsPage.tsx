import { BookingStatus, type BookingResponse } from "@nexa/shared";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, ChevronRight, Gift } from "lucide-react";
import { useBookings } from "../hooks/useBookings";
const statusMeta: Record<BookingStatus, { label: string; color: string }> = {
  [BookingStatus.BOOKED]: { label: "Booked", color: "text-warning" },
  [BookingStatus.ASSIGNED]: { label: "Assigned", color: "text-info" },
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
            const meta = statusMeta[b.status] || { label: b.status, color: "text-muted-foreground" };
            const isUnpaid = b.paymentStatus === 'pending' || b.paymentStatus === 'failed';
            const isPaid = b.paymentStatus === 'captured';
            const isRefunded = b.paymentStatus === 'refunded';

            return (
              <motion.div
                key={b.bookingId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-full glass-card p-4 space-y-3"
              >
                <div
                  onClick={() => navigate(`/bookings/status/${b.bookingId}`)}
                  className="flex items-center gap-3 cursor-pointer text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Car className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.vehicleSummary}</p>
                    <p className="text-xs text-muted-foreground">
                      £{b.price} · {formatDate(b.bookingTime)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isPaid
                          ? 'bg-success/15 text-success'
                          : isRefunded
                          ? 'bg-purple-500/15 text-purple-400'
                          : isUnpaid
                          ? 'bg-warning/15 text-warning'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {isPaid ? 'Paid' : isRefunded ? 'Refunded' : 'Unpaid'}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                {/* If booking is unpaid and not cancelled, give direct payment completion */}
                {isUnpaid && b.status !== BookingStatus.CANCELLED && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-xs text-warning">Checkout Incomplete</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/payment', { state: { bookingId: b.bookingId } });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow"
                    >
                      Complete Payment (£{b.price})
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Gift Bookings Button */}
      <div className="pt-6">
        <button
          onClick={() => navigate('/book')}
          className="w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-lg"
        >
          <Gift className="w-5 h-5" />
          Give a Gift Booking
        </button>
      </div>
    </div>
  );
};

export default BookingsPage;
