import Link from "next/link";
import type { ReactNode } from "react";

// Lien qui devient un simple conteneur quand `href` est null.
//
// Utilisé par les écrans de démonstration : leurs entités n'existent pas en
// base, donc un lien vers la vraie page de détail y interrogerait Postgres
// avec un identifiant fictif — ce qui levait une erreur 22P02 remontée en
// erreur serveur. Une ligne inerte vaut mieux qu'un lien mort.
export default function ConditionalLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
