import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  gradient: "gold" | "cyan" | "purple";
  delay?: number;
}

const GameCard = ({ title, description, icon: Icon, path, gradient, delay = 0 }: GameCardProps) => {
  const gradientStyles = {
    gold: "from-primary/20 to-primary/5 border-primary/30 hover:border-primary/60 hover:shadow-[0_0_40px_hsl(43_96%_56%/0.2)]",
    cyan: "from-secondary/20 to-secondary/5 border-secondary/30 hover:border-secondary/60 hover:shadow-[0_0_40px_hsl(187_92%_50%/0.2)]",
    purple: "from-accent/20 to-accent/5 border-accent/30 hover:border-accent/60 hover:shadow-[0_0_40px_hsl(270_60%_55%/0.2)]",
  };

  const iconStyles = {
    gold: "bg-primary/20 text-primary",
    cyan: "bg-secondary/20 text-secondary",
    purple: "bg-accent/20 text-accent",
  };

  return (
    <Link
      href={path}
      className={`group block p-6 rounded-2xl bg-gradient-to-br ${gradientStyles[gradient]} border backdrop-blur-sm transition-all duration-500 animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-xl ${iconStyles[gradient]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Play Now
        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
};

export default GameCard;
