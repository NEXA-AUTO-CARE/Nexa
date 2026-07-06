import { BookingStatus, type BookingResponse } from "@nexa/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Clock, User, MapPin, Camera, Star, XCircle } from "lucide-react";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";
const STEP_ORDER: BookingStatus[] = [
  BookingStatus.BOOKED,
  BookingStatus.ASSIGNED,
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

const STEP_LABELS: Record<string, string> = {
  [BookingStatus.BOOKED]: "Booked",
  [BookingStatus.ASSIGNED]: "Assigned",
  [BookingStatus.ACCEPTED]: "Accepted",
  [BookingStatus.IN_PROGRESS]: "In Progress",
  [BookingStatus.COMPLETED]: "Completed",
};

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BookingStatusPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading } = useQuery<BookingResponse>({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data } = await api.get<BookingResponse>(`/bookings/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const currentIndex = booking ? STEP_ORDER.indexOf(booking.status as BookingStatus) : -1;
  const cancelled = booking?.status === BookingStatus.CANCELLED;
  const canCancel = booking?.status === BookingStatus.BOOKED || booking?.status === BookingStatus.ACCEPTED;

  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.delete(`/bookings/${booking.bookingId}`);
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
    } catch (err) {
      setCancelError(describeError(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Booking Status</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your service in real-time</p>
      </motion.div>

      {isLoading ? (
        <div className="glass-card p-5 text-sm text-muted-foreground">Loading booking…</div>
      ) : !booking ? (
        <div className="glass-card p-5 text-sm text-muted-foreground">Booking not found.</div>
      ) : (
        <>
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            {cancelled && (
              <p className="mb-3 text-sm font-medium text-destructive">This booking was cancelled.</p>
            )}
            <div className="space-y-0">
              {STEP_ORDER.map((step, i) => {
                const done = !cancelled && i < currentIndex;
                const active = !cancelled && i === currentIndex;
                return (
                  <div key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : active
                            ? "bg-primary/20 border-2 border-primary text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      {i < STEP_ORDER.length - 1 && (
                        <div className={`w-0.5 h-8 ${done ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-medium ${
                          active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Vendor Info */}
          {booking.vendorName ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{booking.vendorName || "Certified Detailer"}</p>
                <p className="text-xs text-muted-foreground">Assigned Vendor</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Awaiting Match</p>
                <p className="text-xs text-muted-foreground">Finding a detailer for you</p>
              </div>
            </motion.div>
          )}

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-4 space-y-2 text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatWhen(booking.bookingTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{booking.serviceAddress}</span>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 gap-1.5"
              onClick={() => navigate(`/bookings/photos/${booking.bookingId}`)}
            >
              <Camera className="h-4 w-4" /> Photos
            </Button>
            <Button
              variant="secondary"
              className="flex-1 gap-1.5"
              onClick={() => navigate(`/bookings/review/${booking.bookingId}`)}
            >
              <Star className="h-4 w-4" /> Review
            </Button>
          </div>

          {/* Cancel booking */}
          {canCancel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {showCancelConfirm ? (
                <div className="glass-card p-5 space-y-3 border border-destructive/30">
                  <p className="text-sm font-medium text-destructive">Are you sure you want to cancel this booking?</p>
                  <p className="text-xs text-muted-foreground">
                    Cancellations made more than 24 hours before your appointment are eligible for a full refund.
                    Late cancellations may be subject to a 30% retention fee.
                    View our full <Link to="/cancellation-policy" target="_blank" className="text-primary hover:underline font-semibold">Cancellation Policy</Link> for details.
                  </p>
                  {cancelError && (
                    <p className="text-xs text-destructive">{cancelError}</p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      <XCircle className="h-4 w-4" />
                      {cancelling ? "Cancelling…" : "Yes, Cancel Booking"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                    >
                      Go Back
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="h-4 w-4" /> Cancel Booking
                </Button>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default BookingStatusPage;
