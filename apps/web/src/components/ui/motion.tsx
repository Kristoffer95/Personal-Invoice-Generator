"use client";

import { motion, type HTMLMotionProps, type Variants, AnimatePresence } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

// Animation variants for consistent micro-interactions
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Stagger container for list animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    }
  },
};

// Spring configurations
export const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const gentleSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

export const snappySpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 35,
};

// Ease curves
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeOutQuart = [0.25, 1, 0.5, 1] as const;

// Motion wrapper components
interface MotionDivProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const FadeIn = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeIn}
      transition={{ duration: 0.2, ease: easeOutQuart }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeIn.displayName = "FadeIn";

export const FadeInUp = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeInUp}
      transition={{ duration: 0.3, ease: easeOutExpo }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
FadeInUp.displayName = "FadeInUp";

export const ScaleIn = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={scaleIn}
      transition={{ duration: 0.2, ease: easeOutQuart }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
ScaleIn.displayName = "ScaleIn";

// Stagger list wrapper
interface StaggerListProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

export const StaggerList = React.forwardRef<HTMLDivElement, StaggerListProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerList.displayName = "StaggerList";

export const StaggerItem = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
);
StaggerItem.displayName = "StaggerItem";

// Interactive button wrapper with hover/tap animations
interface MotionButtonWrapperProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  disabled?: boolean;
}

export const MotionButtonWrapper = React.forwardRef<HTMLDivElement, MotionButtonWrapperProps>(
  ({ children, className, disabled, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={snappySpring}
      className={cn("inline-flex", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionButtonWrapper.displayName = "MotionButtonWrapper";

// Card with hover lift effect
interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  hoverEffect?: boolean;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className, hoverEffect = true, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      whileHover={hoverEffect ? {
        y: -2,
        boxShadow: "0 8px 30px -12px rgba(0, 0, 0, 0.15)",
        transition: { duration: 0.2 }
      } : undefined}
      transition={{ duration: 0.3, ease: easeOutExpo }}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
);
MotionCard.displayName = "MotionCard";

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: easeOutExpo }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Skeleton loader with shimmer
export function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ translateX: ["0%", "200%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

// Export AnimatePresence for convenience
export { AnimatePresence, motion };
