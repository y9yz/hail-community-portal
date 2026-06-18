import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;      
  maxStars?: number;    
  size?: "sm" | "md";   
  interactive?: boolean;
  onRate?: (rating: number) => void; 
}

const StarRating = ({ rating, maxStars = 5, size = "sm", interactive = false, onRate }: StarRatingProps) => {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <Star
            key={i}
            className={cn(
              sizeClass,
              filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
              interactive && "cursor-pointer hover:text-yellow-400 transition-colors"
            )}
            onClick={() => interactive && onRate?.(i + 1)}
          />
        );
      })}
    </div>
  );
};

export default StarRating;
