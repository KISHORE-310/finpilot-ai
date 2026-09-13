declare module "next" {
  export interface Metadata {
    title?: string | { default: string; template?: string };
    description?: string;
    [key: string]: any;
  }
}

declare module "next/navigation" {
  export function useRouter(): {
    push(href: string): void;
    replace(href: string): void;
    prefetch(href: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function redirect(url: string): never;
}

declare module "next/link" {
  import React, { ComponentProps, ReactNode } from "react";
  export interface LinkProps extends ComponentProps<"a"> {
    href: string;
    children?: ReactNode;
    prefetch?: boolean;
    replace?: boolean;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    className?: string;
  }
  const Link: React.FC<LinkProps>;
  export default Link;
}

declare module "next/font/google" {
  export function Inter(options?: { subsets?: string[] }): { className: string };
}
