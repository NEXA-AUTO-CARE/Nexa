import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { id: bookingId } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/bookings/${bookingId}/review`, {
        rating,
        comment: review.trim() || null,
      });
      toast({
        title: "Thanks for your feedback!",
        description: "Your review has been recorded.",
      });
      navigate("/bookings");
    } catch (err) {
      toast({
        title: "Could not submit review",
        description: describeError(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Rate Service</h1>
        <p className="text-sm text-muted-foreground mt-1">How was your experience?</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center gap-2 py-4"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
            disabled={submitting}
          >
            <Star
              className={`h-10 w-10 transition-colors ${
                star <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </motion.div>

      {rating > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          {rating <= 2 ? "We're sorry to hear that" : rating <= 4 ? "Thanks for your feedback!" : "Excellent! Glad you loved it!"}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <textarea
          placeholder="Tell us about your experience..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={submitting}
          className="w-full h-32 rounded-xl bg-secondary border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </motion.div>

      <Button
        variant="hero"
        className="w-full h-12 gap-2"
        disabled={rating === 0 || submitting}
        onClick={handleSubmit}
      >
        <Send className="h-4 w-4" /> {submitting ? "Submitting Review..." : "Submit Review"}
      </Button>
    </div>
  );
};

export default ReviewPage;
