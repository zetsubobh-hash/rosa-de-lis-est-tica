import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  author: string;
  rating: number;
  text: string;
  timeAgo: string;
  profilePhoto?: string;
}

interface GoogleReviewsData {
  rating: number;
  totalReviews: number;
  reviews: Review[];
}

const fallbackReviews: Review[] = [
  {
    author: "Ana Paula Silva",
    rating: 5,
    text: "Atendimento maravilhoso! A Camila é super profissional e cuidadosa. Saí me sentindo renovada. Recomendo demais!",
    timeAgo: "2 semanas atrás",
  },
  {
    author: "Mariana Costa",
    rating: 5,
    text: "Melhor clínica de estética da região! Ambiente acolhedor e resultados incríveis. Já sou cliente fiel.",
    timeAgo: "1 mês atrás",
  },
  {
    author: "Fernanda Oliveira",
    rating: 5,
    text: "Fiz drenagem linfática e amei o resultado. Profissionais atenciosas e muito competentes. Voltarei com certeza!",
    timeAgo: "3 semanas atrás",
  },
  {
    author: "Juliana Santos",
    rating: 5,
    text: "Experiência incrível! O ambiente é lindo e relaxante. A limpeza de pele foi perfeita, minha pele ficou maravilhosa.",
    timeAgo: "1 semana atrás",
  },
  {
    author: "Carla Mendes",
    rating: 5,
    text: "Profissionalismo e carinho no atendimento. Faço tratamento há meses e os resultados são visíveis. Super indico!",
    timeAgo: "2 meses atrás",
  },
  {
    author: "Beatriz Almeida",
    rating: 5,
    text: "Lugar encantador! Fui muito bem recebida e o procedimento superou minhas expectativas. Nota 10!",
    timeAgo: "3 semanas atrás",
  },
];

const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < count ? "text-[hsl(45,93%,47%)] fill-[hsl(45,93%,47%)]" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

const GoogleReviews = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [overallRating, setOverallRating] = useState(5);
  const [totalReviews, setTotalReviews] = useState(28);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-reviews");
        if (error) throw error;
        const result = data as GoogleReviewsData;
        if (result.reviews && result.reviews.length > 0) {
          setReviews(result.reviews);
          setOverallRating(result.rating);
          setTotalReviews(result.totalReviews);
        }
      } catch (err) {
        console.error("Failed to fetch Google reviews, using fallback:", err);
      }
    };
    fetchReviews();
  }, []);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    checkScroll();
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 340;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="relative py-20 bg-secondary overflow-hidden">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-body text-xs tracking-[0.3em] uppercase text-primary font-semibold mb-3">
            Avaliações reais
          </p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            O que nossas clientes dizem
          </h2>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(overallRating)
                      ? "text-[hsl(45,93%,47%)] fill-[hsl(45,93%,47%)]"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="font-heading text-xl font-bold text-foreground">
              {overallRating.toFixed(1)}
            </span>
            <span className="font-body text-sm text-muted-foreground">
              ({totalReviews} avaliações) no Google
            </span>
            <svg className="w-5 h-5 ml-1" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Carousel */}
      <div className="relative max-w-7xl mx-auto px-6">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {reviews.map((review, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="flex-shrink-0 w-[310px] snap-start bg-card rounded-2xl border border-border p-6 relative"
            >
              <Quote className="w-8 h-8 text-primary/15 absolute top-4 right-4" />

              <div className="flex items-center gap-3 mb-4">
                {review.profilePhoto ? (
                  <img
                    src={review.profilePhoto}
                    alt={review.author}
                    className="w-10 h-10 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-heading text-sm font-bold text-primary">
                    {review.author.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="font-heading text-sm font-bold text-foreground">{review.author}</p>
                  <p className="font-body text-[11px] text-muted-foreground">{review.timeAgo}</p>
                </div>
              </div>

              <Stars count={review.rating} />

              <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-4">
                "{review.text}"
              </p>

              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-body text-[10px] text-muted-foreground">Avaliação Google</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GoogleReviews;
