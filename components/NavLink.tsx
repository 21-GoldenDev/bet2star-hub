import Link from "next/link";
import { useRouter } from "next/router";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  to?: string | { pathname: string };
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const router = useRouter();
    const isActive = to && (router.pathname === to || router.asPath === to);

    return (
      <Link href={to as string} legacyBehavior>
        <a ref={ref} className={cn(className, isActive && activeClassName)} {...props} />
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
