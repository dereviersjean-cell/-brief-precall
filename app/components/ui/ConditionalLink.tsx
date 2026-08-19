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
  ...rest
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
  // `data-tour` notamment : l'ancre de la visite guidée doit survivre au
  // passage lien → div, sinon la cible disparaît en mode démonstration.
  [key: `data-${string}`]: string | undefined;
}) {
  if (!href) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}
